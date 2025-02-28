import { GITHUB_CONFIG } from "../config/config.js";

import {
  InvalidRequestException,
  NotFoundException,
} from '../../common/exception/index.js';


import {
  createGithubAuthHeader,
  request,
  setChromeStorage,
  closeLatestTab,
} from '../../common/utils/index.js';

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

  closeLatestTab();

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
