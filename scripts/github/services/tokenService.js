import {
  HttpException,
  SetupRequiredException,
} from '../../common/exception/index.js';
import { getChromeStorage } from '../../common/utils/index.js';
import { GITHUB_CONFIG } from '../config/config.js';
import { clearExpiredLogin, LOGIN_TYPE, saveTokens } from './authService.js';
import { postToGithubOAuth } from './oauthRequest.js';

// Refresh a little before the token expires, so it does not expire during an upload.
const REFRESH_MARGIN = 5 * 60 * 1000;

// The refresh that is running. A refresh token can be used only once, so two requests
// that both find the token expired share one refresh instead of failing the second one.
let runningRefresh = null;

/**
 * Exchanges the refresh token for a new access token and refresh token.
 * A token from the device flow is refreshed without the client secret.
 * @throws {SetupRequiredException} If the refresh token is missing, expired or revoked,
 *   or the user logged out during the refresh.
 * @throws {Error} If the refresh could not reach GitHub. The login is kept.
 * @returns {Promise<string>} The new access token.
 */
const refreshAccessToken = async () => {
  const refreshToken = await getChromeStorage('githubRefreshToken');
  if (!refreshToken) {
    await clearExpiredLogin();
    throw new SetupRequiredException('GitHub', 'login-expired');
  }

  let response;
  try {
    response = await postToGithubOAuth('/login/oauth/access_token', {
      client_id: GITHUB_CONFIG.CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
  } catch (e) {
    // A network error, a timeout or a server error says nothing about the refresh token,
    // so the login is kept and the user tries again.
    if (!(e instanceof HttpException) || e.status >= 500) {
      throw new Error(
        'Could not refresh the GitHub login. Check the network and try again.',
        { cause: e },
      );
    }
    throw e;
  }

  // Such as `bad_refresh_token` when it has expired after 6 months or was revoked.
  if (!response?.access_token) {
    await clearExpiredLogin();
    throw new SetupRequiredException('GitHub', 'login-expired');
  }

  // The user may have logged out, or logged in again, while the refresh was running.
  // Saving then would bring back a login without the GitHub ID, or replace the new one,
  // so the refreshed tokens are dropped and the current login, if any, is used.
  if ((await getChromeStorage('githubRefreshToken')) !== refreshToken) {
    const currentToken = await getChromeStorage('githubAccessToken');
    if (!currentToken) {
      throw new SetupRequiredException('GitHub', 'login');
    }
    return currentToken;
  }

  await saveTokens(response);
  return response.access_token;
};

/**
 * Returns an access token to call the GitHub API with, refreshing it when it is about to expire.
 * @throws {SetupRequiredException} If the user has not logged in, logged in with the old
 *   OAuth App, or the login cannot be refreshed.
 * @returns {Promise<string>} The access token.
 */
export const getAccessToken = async () => {
  const accessToken = await getChromeStorage('githubAccessToken');
  if (!accessToken) {
    throw new SetupRequiredException('GitHub', 'login');
  }

  // A token of the old OAuth App can write to every repository, so log in again with the App.
  if ((await getChromeStorage('githubLoginType')) !== LOGIN_TYPE) {
    await clearExpiredLogin();
    throw new SetupRequiredException('GitHub', 'login-upgrade');
  }

  const expiresAt = await getChromeStorage('githubTokenExpiresAt');
  if (!expiresAt || Date.now() < expiresAt - REFRESH_MARGIN) {
    return accessToken;
  }

  runningRefresh ??= refreshAccessToken().finally(() => {
    runningRefresh = null;
  });
  return runningRefresh;
};
