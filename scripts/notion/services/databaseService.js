import { InvalidRequestException } from '../../common/exception/index.js';
import {
  fetchAllPages,
  getChromeStorage,
  request,
} from '../../common/utils/index.js';
import { NOTION_CONFIG } from '../config/config.js';
import { createPage } from '../endpoints/pages.js';
import { createProblemPageData } from '../objects/problemPage.js';

// The maximum page size of the Notion API.
const DATABASES_PER_PAGE = 100;

/**
 * Retrieves all databases shared with the integration, following every page.
 * @throws {Error} If the access token is missing or invalid.
 * @returns {Promise<Object[]>} A list of databases.
 */
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

  return fetchAllPages(async (startCursor) => {
    const body = JSON.stringify({
      filter: {
        value: 'database',
        property: 'object',
      },
      page_size: DATABASES_PER_PAGE,
      start_cursor: startCursor,
    });

    const response = await request(url, 'POST', headers, body);

    return {
      items: response.results,
      nextCursor: response.has_more ? response.next_cursor : null,
    };
  });
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
