import { notionRequest } from './request.js';

// Search and query are POST requests that only read, so they are sent again after a network
// error, a timeout or a server error, and time out like a GET.
const READ = Object.freeze({ idempotent: true });

/**
 * Searches pages and data sources shared with the integration.
 * @param {Object} body - The search request body.
 * @returns {Promise<Object>} The search result.
 */
export const search = async (body) =>
  notionRequest('/v1/search', 'POST', body, READ);

/**
 * Retrieves a database, with the IDs and names of its data sources in `data_sources`.
 * @param {string} databaseId - The database to retrieve.
 * @returns {Promise<Object>} The database.
 */
export const getDatabase = async (databaseId) =>
  notionRequest(`/v1/databases/${databaseId}`, 'GET');

/**
 * Queries the pages of a data source.
 * Since Notion-Version 2025-09-03, the rows of a database belong to its data sources.
 * @param {string} dataSourceId - The data source to query.
 * @param {Object} body - The query request body, such as a filter.
 * @returns {Promise<Object>} The query result.
 */
export const queryDataSource = async (dataSourceId, body) =>
  notionRequest(`/v1/data_sources/${dataSourceId}/query`, 'POST', body, READ);
