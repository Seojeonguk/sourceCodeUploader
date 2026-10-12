/**
 * Fetches every page of a paginated API and collects the items.
 * @param {(cursor: *) => Promise<{items: Array, nextCursor: *}>} fetchPage -
 *   Fetches one page. `cursor` is undefined for the first page.
 *   Returns the items of the page and the cursor of the next page, or a falsy value on the last page.
 * @returns {Promise<Array>} The items of all pages.
 */
export const fetchAllPages = async (fetchPage, cursor = undefined) => {
  const { items, nextCursor } = await fetchPage(cursor);
  if (!nextCursor) {
    return items;
  }

  return [...items, ...(await fetchAllPages(fetchPage, nextCursor))];
};
