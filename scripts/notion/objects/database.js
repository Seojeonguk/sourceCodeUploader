const UNTITLED = 'Untitled';

/**
 * Returns the title of a database from the Notion API.
 * The title is a rich text array, which is empty for an untitled database.
 * @param {Object} database - The database object.
 * @returns {string} The title, or `Untitled` if the database has no title.
 */
export const getDatabaseTitle = (database) =>
  (database?.title ?? [])
    .map((text) => text.plain_text ?? '')
    .join('')
    .trim() || UNTITLED;
