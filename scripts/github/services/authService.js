import { GITHUB_CONFIG } from '../config/config.js';

import { NotFoundException } from '../../common/exception/index.js';

import {
  createGithubAuthHeader,
  request,
  setChromeStorage,
  removeChromeStorage,
} from '../../common/utils/index.js';

// Marks a login made with the GitHub App. A token saved without it is from the old OAuth App,
// which had the `repo` scope on every repository, so it is not used any more.
export const LOGIN_TYPE = 'app';

// Saved when the user logs in.
const LOGIN_KEYS = Object.freeze([
  'githubAccessToken',
  'githubRefreshToken',
  'githubTokenExpiresAt',
  'githubLoginType',
  'githubID',
]);
// Selected by the user in the popup.
const SETTING_KEYS = Object.freeze(['githubUploadedRepository']);

/**
 * Opens the login page, which shows the device code to enter on GitHub.
 * The device flow does not need the client secret.
 */
export const openLoginPage = () =>
  chrome.tabs.create({
    url: chrome.runtime.getURL('popup/html/githubLogin.html'),
  });

/**
 * Reads the GitHub user ID of the access token.
 * @param {string} accessToken - The GitHub access token.
 * @returns {Promise<string>} The GitHub user ID.
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

/**
 * Saves the tokens from GitHub's token endpoint.
 * A GitHub App user access token expires after 8 hours, and comes with a refresh token.
 * @param {Object} response - The response of `/login/oauth/access_token`.
 * @param {number} [now=Date.now()] - The time the response was received.
 */
export const saveTokens = async (response, now = Date.now()) => {
  await Promise.all([
    setChromeStorage('githubAccessToken', response.access_token),
    setChromeStorage('githubRefreshToken', response.refresh_token ?? null),
    setChromeStorage(
      'githubTokenExpiresAt',
      response.expires_in ? now + response.expires_in * 1000 : null,
    ),
    setChromeStorage('githubLoginType', LOGIN_TYPE),
  ]);
};

/**
 * Saves a new login: the tokens and the GitHub ID.
 * @param {Object} response - The response of `/login/oauth/access_token`.
 * @param {string} githubID - The GitHub user ID.
 */
export const saveLogin = async (response, githubID) => {
  await Promise.all([
    saveTokens(response),
    setChromeStorage('githubID', githubID),
  ]);
};

/**
 * Logs out: removes the login and the selected repository.
 * GitHub cannot revoke a token without the client secret, so the user revokes it on
 * the authorized apps page if they want to.
 * @returns {Promise<{authorizedAppsUrl: string}>} The page to revoke the access on GitHub.
 */
export const logout = async () => {
  await removeChromeStorage([...LOGIN_KEYS, ...SETTING_KEYS]);
  return { authorizedAppsUrl: GITHUB_CONFIG.AUTHORIZED_APPS_URL };
};

/**
 * Removes the login after GitHub rejected the access token.
 * The selected repository is kept for the next login.
 */
export const clearExpiredLogin = () => removeChromeStorage([...LOGIN_KEYS]);
