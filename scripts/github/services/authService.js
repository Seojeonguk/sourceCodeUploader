import { GITHUB_CONFIG } from '../config/config.js';

import { NotFoundException } from '../../common/exception/index.js';

import {
  createGithubAuthHeader,
  request,
  setChromeStorage,
  removeChromeStorage,
} from '../../common/utils/index.js';

// Saved when the user logs in.
const LOGIN_KEYS = Object.freeze(['githubAccessToken', 'githubID']);
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

export const saveInfo = async (accessToken, githubID) => {
  await Promise.all([
    setChromeStorage('githubAccessToken', accessToken),
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
