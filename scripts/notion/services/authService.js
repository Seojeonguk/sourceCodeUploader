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
} from '../../common/exception/index.js';

// Saved when the user logs in.
const LOGIN_KEYS = Object.freeze(['notionAccessToken']);
// Selected by the user in the popup.
const SETTING_KEYS = Object.freeze([
  'notionUploadedDatabase',
  'notionUploadedDatabases',
  'notionUploadedDatabaseId',
]);

const createBasicAuthHeader = () =>
  `Basic ${btoa(`${NOTION_CONFIG.CLIENT_ID}:${NOTION_CONFIG.CLIENT_SECRET}`)}`;

export const openOauthPage = () =>
  openOAuthPage('notion', (state) => {
    const params = new URLSearchParams({
      owner: 'user',
      client_id: NOTION_CONFIG.CLIENT_ID,
      response_type: 'code',
      redirect_uri: NOTION_CONFIG.REDIRECT_URL,
      state,
    });

    return `${NOTION_CONFIG.API_BASE_URL}/v1/oauth/authorize?${params}`;
  });

export const getAccessToken = async (payload) => {
  if (!payload?.code) {
    throw new InvalidRequestException('Notion', 'code');
  }

  const { code } = payload;

  const url = `${NOTION_CONFIG.API_BASE_URL}/v1/oauth/token`;
  const data = JSON.stringify({
    grant_type: 'authorization_code',
    code,
    redirect_uri: NOTION_CONFIG.REDIRECT_URL,
  });

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: createBasicAuthHeader(),
  };

  const response = await request(url, 'POST', headers, data);
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
export const login = async (code) => {
  const accessToken = await getAccessToken({ code });
  setChromeStorage('notionAccessToken', accessToken);
};

/**
 * Revokes the access token on Notion.
 * @param {string} accessToken - The access token to revoke.
 */
export const revokeAccessToken = async (accessToken) => {
  const url = `${NOTION_CONFIG.API_BASE_URL}/v1/oauth/revoke`;
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_CONFIG.API_VERSION,
    Authorization: createBasicAuthHeader(),
  };

  await request(url, 'POST', headers, JSON.stringify({ token: accessToken }));
};

/**
 * Logs out: revokes the access token and removes the login and the selected database.
 * The saved values are removed even if revoking fails, such as when the token has already expired.
 */
export const logout = async () => {
  const accessToken = await getChromeStorage('notionAccessToken');
  if (accessToken) {
    try {
      await revokeAccessToken(accessToken);
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
