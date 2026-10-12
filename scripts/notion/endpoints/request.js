import { SetupRequiredException } from '../../common/exception/index.js';
import { getChromeStorage, request } from '../../common/utils/index.js';
import { NOTION_CONFIG } from '../config/config.js';

/**
 * Sends a request to the Notion API with the saved access token.
 * @param {string} path - The API path, such as `/v1/pages`.
 * @param {string} method - The HTTP method.
 * @param {Object} [body] - The request body. It is sent as JSON.
 * @throws {SetupRequiredException} If the user has not logged in to Notion.
 * @returns {Promise<Object>} The response body.
 */
export const notionRequest = async (path, method, body = undefined) => {
  const accessToken = await getChromeStorage('notionAccessToken');
  if (!accessToken) {
    throw new SetupRequiredException('Notion', 'login');
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_CONFIG.API_VERSION,
  };

  return request(
    `${NOTION_CONFIG.API_BASE_URL}${path}`,
    method,
    headers,
    body && JSON.stringify(body),
  );
};
