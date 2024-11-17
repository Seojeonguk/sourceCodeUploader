import * as Github from '../constants/errors.js';
import * as Util from '../../util.js';
import { createGithubAuthHeader, request } from '../../utils/fetchUtils.js';
import { GITHUB_CONFIG } from '../config/config.js';
import { AUTH_REQUIREMENTS, STORAGE_KEYS } from '../constants/storage.js';
import { accessTokenNotFoundException } from '../customExceptions/AccessTokenNotFoundException.js';
import { githubIDNotFoundException } from '../customExceptions/githubIDNotFoundException.js';

/**
 * Opens the OAuth authorization page for the user to grant access.
 */
export const openOauthPage = () => {
  const params = new URLSearchParams({
    client_id: GITHUB_CONFIG.CLIENT_ID,
    redirect_uri: GITHUB_CONFIG.REDIRECT_URL,
    scope: GITHUB_CONFIG.SCOPES[0],
  });

  chrome.tabs.create({
    url: `${GITHUB_CONFIG.BASE_URL}/login/oauth/authorize?${params}`,
  });
};

/**
 * Retrieves the access token using the provided authorization code.
 * @param {Object} payload - The payload containing the authorization code.
 * @param {string} payload.code - The authorization code.
 * @throws {Error} If the code is invalid or the access token is not found.
 * @returns {Promise<string>} The access token.
 */
export const getAccessToken = async (payload) => {
  if (!payload?.code) {
    throw new Error(Github.ERROR[Github.INVALID_CODE]);
  }

  const url = `${GITHUB_CONFIG.BASE_URL}/login/oauth/access_token`;
  const data = new FormData();
  data.append('client_id', GITHUB_CONFIG.CLIENT_ID);
  data.append('client_secret', GITHUB_CONFIG.CLIENT_SECRET);
  data.append('code', payload.code);

  const response = await request(url, 'POST', undefined, data);
  const accessToken = response.match(/access_token=([^&]*)/)?.[1];
  if (!accessToken) {
    throw new accessTokenNotFoundException(
      Github.ERROR[Github.NOT_FOUND_ACCESS_TOKEN],
    );
  }

  Util.closeLatestTab();

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
    throw new githubIDNotFoundException(
      Github.ERROR[Github.NOT_FOUND_GITHUB_ID],
    );
  }

  return githubID;
};

/**
 * Checks if the required authentication details are stored in Chrome storage.
 * @param {string[]} [requirements=AUTH_REQUIREMENTS.ALL] - The list of authentication requirements to check.
 * @throws {Error} If any of the required authentication details are not found.
 * @returns {Promise<Object>} An object containing the stored authentication details.
 */
export const checkAuthRequirements = async (
  requirements = AUTH_REQUIREMENTS.ALL,
) => {
  const errorMap = {
    [STORAGE_KEYS.ACCESS_TOKEN]: Github.INVALID_ACCESS_TOKEN,
    [STORAGE_KEYS.GITHUB_ID]: Github.INVALID_GITHUB_ID,
    [STORAGE_KEYS.UPLOADED_REPOSITORY]: Github.INVALID_UPLOADED_REPOSITORY,
  };

  const result = {};
  for (const key of requirements) {
    const value = await Util.getChromeStorage(STORAGE_KEYS[key]);
    if (!value) {
      throw new Error(Github.ERROR[errorMap[STORAGE_KEYS[key]]]);
    }
    result[STORAGE_KEYS[key]] = value;
  }

  return result;
};

export const saveInfo = (accessToken, githubID) => {
  Util.setChromeStorage(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  Util.setChromeStorage(STORAGE_KEYS.GITHUB_ID, githubID);
};
