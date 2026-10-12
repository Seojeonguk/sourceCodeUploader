import { openOAuthPage } from '../../oauth/state.js';
import { GITHUB_CONFIG } from '../config/config.js';

import {
  InvalidRequestException,
  NotFoundException,
} from '../../common/exception/index.js';

import {
  createGithubAuthHeader,
  request,
  getChromeStorage,
  setChromeStorage,
  removeChromeStorage,
  logger,
} from '../../common/utils/index.js';

// Saved when the user logs in.
const LOGIN_KEYS = Object.freeze(['githubAccessToken', 'githubID']);
// Selected by the user in the popup.
const SETTING_KEYS = Object.freeze(['githubUploadedRepository']);

/**
 * Opens the OAuth authorization page for the user to grant access.
 */
export const openOauthPage = () =>
  openOAuthPage('github', (state) => {
    const params = new URLSearchParams({
      client_id: GITHUB_CONFIG.CLIENT_ID,
      redirect_uri: GITHUB_CONFIG.REDIRECT_URL,
      scope: GITHUB_CONFIG.SCOPES[0],
      state,
    });

    return `${GITHUB_CONFIG.BASE_URL}/login/oauth/authorize?${params}`;
  });

/**
 * Retrieves the access token using the provided authorization code.
 * @param {Object} payload - The payload containing the authorization code.
 * @param {string} payload.code - The authorization code.
 * @throws {Error} If the code is invalid or the access token is not found.
 * @returns {Promise<string>} The access token.
 */
export const getAccessToken = async (payload) => {
  if (!payload?.code) {
    throw new InvalidRequestException('Github', 'code');
  }

  const url = `${GITHUB_CONFIG.BASE_URL}/login/oauth/access_token`;
  const data = new FormData();
  data.append('client_id', GITHUB_CONFIG.CLIENT_ID);
  data.append('client_secret', GITHUB_CONFIG.CLIENT_SECRET);
  data.append('code', payload.code);

  const response = await request(url, 'POST', undefined, data);
  const accessToken = response.match(/access_token=([^&]*)/)?.[1];
  if (!accessToken) {
    throw new NotFoundException('Github', 'access token');
  }

  return accessToken;
};

/**
 * Saves the user's access token and GitHub ID in Chrome storage.
 * @param {string} accessToken - The GitHub access token.
 * @param {string} githubID - The GitHub user ID.
 */
export const getUserInfo = async (accessToken) => {
  const url = `${GITHUB_CONFIG.API_BASE_URL}/user`;
  const headers = createGithubAuthHeader(accessToken);

  const response = await request(url, 'GET', headers, undefined);
  const githubID = response?.login;
  if (!githubID) {
    throw new NotFoundException('Github', 'github ID');
  }

  return githubID;
};

export const saveInfo = (accessToken, githubID) => {
  setChromeStorage('githubAccessToken', accessToken);
  setChromeStorage('githubID', githubID);
};

/**
 * Logs in with the authorization code from the OAuth redirect.
 * @param {string} code - The authorization code.
 */
export const login = async (code) => {
  const accessToken = await getAccessToken({ code });
  const githubID = await getUserInfo(accessToken);
  saveInfo(accessToken, githubID);
};

/**
 * Revokes the access token on GitHub.
 * @param {string} accessToken - The access token to revoke.
 */
export const revokeAccessToken = async (accessToken) => {
  const url = `${GITHUB_CONFIG.API_BASE_URL}/applications/${GITHUB_CONFIG.CLIENT_ID}/token`;
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Basic ${btoa(`${GITHUB_CONFIG.CLIENT_ID}:${GITHUB_CONFIG.CLIENT_SECRET}`)}`,
    'Content-Type': 'application/json',
  };

  await request(
    url,
    'DELETE',
    headers,
    JSON.stringify({ access_token: accessToken }),
  );
};

/**
 * Logs out: revokes the access token and removes the login and the selected repository.
 * The saved values are removed even if revoking fails, such as when the token has already expired.
 */
export const logout = async () => {
  const accessToken = await getChromeStorage('githubAccessToken');
  if (accessToken) {
    try {
      await revokeAccessToken(accessToken);
    } catch (e) {
      logger.warn('Failed to revoke the GitHub access token.', e.message);
    }
  }

  await removeChromeStorage([...LOGIN_KEYS, ...SETTING_KEYS]);
};

/**
 * Removes the login after GitHub rejected the access token.
 * The selected repository is kept for the next login.
 */
export const clearExpiredLogin = () => removeChromeStorage([...LOGIN_KEYS]);
