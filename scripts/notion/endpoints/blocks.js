import { fetchAllPages } from '../../common/utils/index.js';
import { notionRequest } from './request.js';

// The maximum page size of the Notion API.
const BLOCKS_PER_PAGE = 100;

/**
 * Retrieves all child blocks of a block or a page, following every page.
 * @param {string} blockId - The block or page ID.
 * @returns {Promise<Object[]>} The child blocks.
 */
export const getBlockChildren = async (blockId) =>
  fetchAllPages(async (startCursor) => {
    const params = new URLSearchParams({ page_size: BLOCKS_PER_PAGE });
    if (startCursor) {
      params.set('start_cursor', startCursor);
    }

    const response = await notionRequest(
      `/v1/blocks/${blockId}/children?${params}`,
      'GET',
    );

    return {
      items: response.results,
      nextCursor: response.has_more ? response.next_cursor : null,
    };
  });

/**
 * Updates a block, such as the text of a code block.
 * @param {string} blockId - The block to update.
 * @param {Object} data - The block type and its new content, such as `{ code: {...} }`.
 * @returns {Promise<Object>} The updated block.
 */
export const updateBlock = async (blockId, data) =>
  notionRequest(`/v1/blocks/${blockId}`, 'PATCH', data);

/**
 * Appends blocks to the end of a block or a page.
 * @param {string} blockId - The block or page ID.
 * @param {Object[]} children - The blocks to append.
 * @returns {Promise<Object>} The appended blocks.
 */
export const appendBlockChildren = async (blockId, children) =>
  notionRequest(`/v1/blocks/${blockId}/children`, 'PATCH', { children });
