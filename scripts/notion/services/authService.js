import {
  getChromeStorage,
  logger,
  removeChromeStorage,
  request,
  setChromeStorage,
} from '../../common/utils/index.js';
import { NOTION_CONFIG } from '../config/config.js';

import {
  InvalidRequestException,
  NotFoundException,
  OAuthException,
  SetupRequiredException,
} from '../../common/exception/index.js';

// Saved when the user logs in.
const LOGIN_KEYS = Object.freeze(['notionAccessToken']);
// Selected by the user in the popup.
const SETTING_KEYS = Object.freeze([
  'notionUploadedDatabase',
  'notionUploadedDatabases',
  'notionUploadedDatabaseId',
  'notionUploadedDataSourceId',
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

// Kept until the popup shows it: the popup closes when the login window opens,
// so it cannot receive the result of the login.
const LOGIN_ERROR_KEY = 'notionLoginError';

/**
 * Opens the Notion authorization page in a window of the browser, and returns the URL that
 * Notion redirects to. Chrome catches the redirect to `https://<extension-id>.chromiumapp.org/`,
 * so the authorization code never reaches another site.
 * @param {string} state - The random state sent with the request.
 * @throws {OAuthException} If the window was closed before the login finished.
 * @returns {Promise<URL>} The redirect URL.
 */
const launchAuthorizationPage = async (state) => {
  const params = new URLSearchParams({
    owner: 'user',
    client_id: NOTION_CONFIG.CLIENT_ID,
    response_type: 'code',
    // The token proxy sends the same URI, so the extension ID must be the one it is set for.
    redirect_uri: chrome.identity.getRedirectURL(),
    state,
  });

  try {
    // From Chrome 116 (minimum_chrome_version), the service worker is kept past the
    // 5-minute limit while this window is open, so a slow login is not lost.
    const redirectUrl = await chrome.identity.launchWebAuthFlow({
      url: `${NOTION_CONFIG.API_BASE_URL}/v1/oauth/authorize?${params}`,
      interactive: true,
    });
    return new URL(redirectUrl);
  } catch (e) {
    // Such as `The user did not approve access.` when the window is closed.
    logger.warn('The Notion login window did not finish.', e.message);
    throw new OAuthException('Notion', 'window_closed');
  }
};

/**
 * Logs in to Notion: opens the authorization page, checks the redirect and exchanges the code.
 * @param {string} [proxyUrl] - The URL of the token proxy, checked before opening the page.
 * @throws {SetupRequiredException} If the proxy URL is not set.
 * @throws {OAuthException} If the window was closed, the state does not match,
 *   or Notion sent an error such as `access_denied`.
 */
export const authorize = async (proxyUrl = NOTION_CONFIG.TOKEN_PROXY_URL) => {
  if (!proxyUrl) {
    throw new SetupRequiredException('Notion', 'proxy');
  }

  const state = crypto.randomUUID();
  const { searchParams } = await launchAuthorizationPage(state);

  if (searchParams.get('state') !== state) {
    throw new OAuthException('Notion', 'state');
  }

  const error = searchParams.get('error');
  const code = searchParams.get('code');
  if (error || !code) {
    throw new OAuthException('Notion', error || 'no_code');
  }

  await login(code, proxyUrl);
};

/**
 * Saves why the last login failed, for the popup to show the next time it opens.
 * @param {?string} message - The error message, or null to clear it.
 */
export const saveLoginError = (message) =>
  message
    ? chrome.storage.session.set({ [LOGIN_ERROR_KEY]: message })
    : chrome.storage.session.remove(LOGIN_ERROR_KEY);

/**
 * Reads and clears why the last login failed.
 * @returns {Promise<?string>} The error message, or null if the last login did not fail.
 */
export const takeLoginError = async () => {
  const message = (await chrome.storage.session.get(LOGIN_ERROR_KEY))[
    LOGIN_ERROR_KEY
  ];
  if (message) {
    await chrome.storage.session.remove(LOGIN_ERROR_KEY);
  }
  return message ?? null;
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
 * @param {string} [proxyUrl] - The URL of the token proxy.
 * @param {string} code - The authorization code.
 */
export const login = async (code, proxyUrl = NOTION_CONFIG.TOKEN_PROXY_URL) => {
  const accessToken = await getAccessToken({ code }, proxyUrl);
  await setChromeStorage('notionAccessToken', accessToken);
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
