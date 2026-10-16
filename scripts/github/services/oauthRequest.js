import { request } from '../../common/utils/index.js';
import { GITHUB_CONFIG } from '../config/config.js';

/**
 * Sends a request to an OAuth endpoint of GitHub, such as `/login/oauth/access_token`.
 * The OAuth endpoints take a form body, and answer in JSON with `Accept: application/json`.
 * They answer errors such as `authorization_pending` with status 200 and an `error` field.
 * @param {string} path - The path on github.com.
 * @param {Object} body - The form fields.
 * @returns {Promise<Object>} The response.
 */
export const postToGithubOAuth = (path, body) =>
  request(
    `${GITHUB_CONFIG.BASE_URL}${path}`,
    'POST',
    {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    new URLSearchParams(body).toString(),
  );
