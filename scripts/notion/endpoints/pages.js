import { notionRequest } from './request.js';

/**
 * Creates a page.
 * @param {Object} data - The request body of the page.
 * @returns {Promise<Object>} The created page.
 */
export const createPage = async (data) =>
  notionRequest('/v1/pages', 'POST', data);

/**
 * Updates the properties of a page.
 * @param {string} pageId - The page to update.
 * @param {Object} properties - The properties to update. Other properties are kept.
 * @returns {Promise<Object>} The updated page.
 */
export const updatePageProperties = async (pageId, properties) =>
  notionRequest(`/v1/pages/${pageId}`, 'PATCH', { properties });
