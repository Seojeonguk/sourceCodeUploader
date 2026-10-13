import {
  DuplicateResourceException,
  SetupRequiredException,
  TimeoutException,
} from '../../common/exception/index.js';
import { fetchAllPages, getChromeStorage } from '../../common/utils/index.js';
import {
  appendBlockChildren,
  getBlockChildren,
  updateBlock,
} from '../endpoints/blocks.js';
import { queryDatabase, search } from '../endpoints/databases.js';
import { createPage, updatePageProperties } from '../endpoints/pages.js';
import {
  createProblemPageData,
  createSourceCodeBlock,
  createSourceCodeBlocks,
  findSourceCodeBlock,
  getPlainText,
  isSameSourceCode,
} from '../objects/problemPage.js';

// The maximum page size of the Notion API.
const DATABASES_PER_PAGE = 100;

/**
 * Retrieves all databases shared with the integration, following every page.
 * @throws {Error} If the access token is missing or invalid.
 * @returns {Promise<Object[]>} A list of databases.
 */
export const getDatabases = async () =>
  fetchAllPages(async (startCursor) => {
    const response = await search({
      filter: {
        value: 'database',
        property: 'object',
      },
      page_size: DATABASES_PER_PAGE,
      start_cursor: startCursor,
    });

    return {
      items: response.results,
      nextCursor: response.has_more ? response.next_cursor : null,
    };
  });

/**
 * Finds the latest page of a problem in the database by its URL property.
 * @param {string} databaseId - The database to search.
 * @param {string} url - The problem URL.
 * @returns {Promise<?Object>} The page, or null if the problem was not uploaded yet.
 */
const findProblemPage = async (databaseId, url) => {
  const response = await queryDatabase(databaseId, {
    filter: { property: 'URL', url: { equals: url } },
    sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    page_size: 1,
  });

  return response.results[0] ?? null;
};

/**
 * Checks whether the problem page already has the source code.
 * @param {string} databaseId - The database to search.
 * @param {string} url - The problem URL.
 * @param {string} sourceCode - The source code that was uploaded.
 * @returns {Promise<?string>} The URL of the page, or null if the page does not have the source code.
 */
const findUploadedPageUrl = async (databaseId, url, sourceCode) => {
  const page = await findProblemPage(databaseId, url);
  if (!page) {
    return null;
  }

  const codeBlock = findSourceCodeBlock(await getBlockChildren(page.id));
  if (
    codeBlock &&
    isSameSourceCode(getPlainText(codeBlock.code.rich_text), sourceCode)
  ) {
    return page.url;
  }
  return null;
};

/**
 * Replaces the source code of an existing problem page.
 * The other blocks, such as the notes under `How to resolve?`, are kept.
 * @param {Object} page - The existing page.
 * @param {Object} payload - The source code and the file extension.
 * @param {Object} properties - The properties of the new page data.
 * @throws {DuplicateResourceException} If the source code is the same.
 */
const replaceSourceCode = async (page, payload, properties) => {
  const blocks = await getBlockChildren(page.id);
  const codeBlock = findSourceCodeBlock(blocks);

  if (codeBlock) {
    if (
      isSameSourceCode(
        getPlainText(codeBlock.code.rich_text),
        payload.sourceCode,
      )
    ) {
      throw new DuplicateResourceException('Notion', 'content');
    }

    const { code } = createSourceCodeBlock(payload);
    await updateBlock(codeBlock.id, {
      code: { rich_text: code.rich_text, language: code.language },
    });
  } else {
    // The code block was removed from the page, so add it again at the end.
    await appendBlockChildren(page.id, createSourceCodeBlocks(payload));
  }

  // Only the upload date and the language change with the new source code.
  await updatePageProperties(page.id, {
    Date: properties.Date,
    mime: properties.mime,
  });
};

/**
 * Uploads a solved problem to the selected Notion database.
 * If the problem was already uploaded, the source code of that page is replaced instead.
 * @param {Object} payload - The source code and the problem ID from the page.
 * @param {Object} problemInfo - The problem title, level, tags and URL.
 * @throws {SetupRequiredException} If no database is selected.
 * @throws {DuplicateResourceException} If the same source code was already uploaded.
 * @returns {Promise<string>} The URL of the created or updated page.
 */
export const upload = async (payload, problemInfo) => {
  const databaseId = await getChromeStorage('notionUploadedDatabaseId');
  if (!databaseId) {
    throw new SetupRequiredException('Notion', 'database');
  }

  const pageData = createProblemPageData({
    databaseId,
    ...payload,
    ...problemInfo,
  });

  const problemUrl = pageData.properties.URL.url;

  try {
    const existingPage = await findProblemPage(databaseId, problemUrl);
    if (existingPage) {
      await replaceSourceCode(existingPage, payload, pageData.properties);
      return existingPage.url;
    }

    const result = await createPage(pageData);
    return result.url ?? result.public_url;
  } catch (e) {
    if (!(e instanceof TimeoutException && e.mayBeApplied)) {
      throw e;
    }

    // Notion may have saved the page before the timeout, so check the page before reporting a failure.
    const uploadedPageUrl = await findUploadedPageUrl(
      databaseId,
      problemUrl,
      payload.sourceCode,
    );
    if (uploadedPageUrl) {
      return uploadedPageUrl;
    }
    throw e;
  }
};
