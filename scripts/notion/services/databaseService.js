import { InvalidRequestException } from '../../common/exception/index.js';
import { getChromeStorage, request } from '../../common/utils/index.js';
import { NOTION_CONFIG } from '../config/config.js';
import { createPage } from '../endpoints/pages.js';
import { createProblemPageData } from '../objects/problemPage.js';

export const getDatabases = async () => {
  const accessToken = await getChromeStorage('notionAccessToken');
  if (!accessToken) {
    throw new InvalidRequestException('Notion', 'access token');
  }

  const url = `${NOTION_CONFIG.API_BASE_URL}/v1/search`;

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  };

  const body = JSON.stringify({
    filter: {
      value: 'database',
      property: 'object',
    },
  });

  const response = await request(url, 'POST', headers, body);

  const { results } = response;

  return results;
};

/**
 * Uploads a solved problem to the selected Notion database.
 * @param {Object} payload - The source code and the problem ID from the page.
 * @param {Object} problemInfo - The problem title, level, tags and URL.
 * @returns {Promise<string>} The URL of the created page.
 */
export const upload = async (payload, problemInfo) => {
  const databaseId = await getChromeStorage('notionUploadedDatabaseId');

  const result = await createPage(
    createProblemPageData({ databaseId, ...payload, ...problemInfo }),
  );

  return result.url ?? result.public_url;
};
