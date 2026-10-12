import { notionRequest } from './request.js';

/**
 * Searches pages and databases shared with the integration.
 * @param {Object} body - The search request body.
 * @returns {Promise<Object>} The search result.
 */
export const search = async (body) => notionRequest('/v1/search', 'POST', body);

/**
 * Queries the pages of a database.
 * @param {string} databaseId - The database to query.
 * @param {Object} body - The query request body, such as a filter.
 * @returns {Promise<Object>} The query result.
 */
export const queryDatabase = async (databaseId, body) =>
  notionRequest(`/v1/databases/${databaseId}/query`, 'POST', body);
