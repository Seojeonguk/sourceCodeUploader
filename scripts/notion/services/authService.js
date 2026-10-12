import {
  getChromeStorage,
  logger,
  removeChromeStorage,
  request,
  setChromeStorage,
} from '../../common/utils/index.js';
import { openOAuthPage } from '../../oauth/state.js';
import { NOTION_CONFIG } from '../config/config.js';

import {
  InvalidRequestException,
  NotFoundException,
  SetupRequiredException,
} from '../../common/exception/index.js';

// Saved when the user logs in.
const LOGIN_KEYS = Object.freeze(['notionAccessToken']);
// Selected by the user in the popup.
const SETTING_KEYS = Object.freeze([
  'notionUploadedDatabase',
  'notionUploadedDatabases',
  'notionUploadedDatabaseId',
]);

/**
 * Sends a request to the proxy/notion-oauth worker, which adds the client secret.
 * @param {string} path - `/token` or `/revoke`.
 * @param {Object} body - The request body.
 * @param {string} proxyUrl - The URL of the deployed worker.
 * @throws {SetupRequiredException} If the proxy URL is not set.
 * @returns {Promise<Object>} The response from Notion.
 */
const requestTokenProxy = (path, body, proxyUrl) => {
  if (!proxyUrl) {
    throw new SetupRequiredException('Notion', 'proxy');
  }

  return request(
    `${proxyUrl.replace(/\/+$/, '')}${path}`,
    'POST',
    { Accept: 'application/json', 'Content-Type': 'application/json' },
    JSON.stringify(body),
  );
};

/**
 * Opens the Notion OAuth authorization page.
 * @param {string} [proxyUrl] - The URL of the token proxy, checked before opening the page.
 * @throws {SetupRequiredException} If the proxy URL is not set.
 */
export const openOauthPage = async (
  proxyUrl = NOTION_CONFIG.TOKEN_PROXY_URL,
) => {
  if (!proxyUrl) {
    throw new SetupRequiredException('Notion', 'proxy');
  }

  return openOAuthPage('notion', (state) => {
    const params = new URLSearchParams({
      owner: 'user',
      client_id: NOTION_CONFIG.CLIENT_ID,
      response_type: 'code',
      redirect_uri: NOTION_CONFIG.REDIRECT_URL,
      state,
    });

    return `${NOTION_CONFIG.API_BASE_URL}/v1/oauth/authorize?${params}`;
  });
};

/**
 * Exchanges the authorization code for an access token through the token proxy.
 * @param {Object} payload
 * @param {string} payload.code - The authorization code.
 * @param {string} [proxyUrl] - The URL of the token proxy.
 * @returns {Promise<string>} The access token.
 */
export const getAccessToken = async (
  payload,
  proxyUrl = NOTION_CONFIG.TOKEN_PROXY_URL,
) => {
  if (!payload?.code) {
    throw new InvalidRequestException('Notion', 'code');
  }

  const response = await requestTokenProxy(
    '/token',
    { code: payload.code },
    proxyUrl,
  );
  const accessToken = response?.access_token;
  if (!accessToken) {
    throw new NotFoundException('Notion', 'access token');
  }

  return accessToken;
};

/**
 * Logs in with the authorization code from the OAuth redirect.
 * @param {string} code - The authorization code.
 */
export const login = async (code, proxyUrl = NOTION_CONFIG.TOKEN_PROXY_URL) => {
  const accessToken = await getAccessToken({ code }, proxyUrl);
  setChromeStorage('notionAccessToken', accessToken);
};

/**
 * Revokes the access token on Notion through the token proxy.
 * @param {string} accessToken - The access token to revoke.
 * @param {string} [proxyUrl] - The URL of the token proxy.
 */
export const revokeAccessToken = async (
  accessToken,
  proxyUrl = NOTION_CONFIG.TOKEN_PROXY_URL,
) => {
  await requestTokenProxy('/revoke', { token: accessToken }, proxyUrl);
};

/**
 * Logs out: revokes the access token and removes the login and the selected database.
 * The saved values are removed even if revoking fails, such as when the token has already expired.
 */
export const logout = async (proxyUrl = NOTION_CONFIG.TOKEN_PROXY_URL) => {
  const accessToken = await getChromeStorage('notionAccessToken');
  if (accessToken) {
    try {
      await revokeAccessToken(accessToken, proxyUrl);
    } catch (e) {
      logger.warn('Failed to revoke the Notion access token.', e.message);
    }
  }

  await removeChromeStorage([...LOGIN_KEYS, ...SETTING_KEYS]);
};

/**
 * Removes the login after Notion rejected the access token.
 * The selected database is kept for the next login.
 */
export const clearExpiredLogin = () => removeChromeStorage([...LOGIN_KEYS]);
