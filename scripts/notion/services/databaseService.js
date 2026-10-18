import {
  DuplicateResourceException,
  SetupRequiredException,
  TimeoutException,
} from '../../common/exception/index.js';
import {
  fetchAllPages,
  getChromeStorage,
  setChromeStorage,
} from '../../common/utils/index.js';
import {
  appendBlockChildren,
  getBlockChildren,
  updateBlock,
} from '../endpoints/blocks.js';
import {
  getDatabase,
  queryDataSource,
  search,
} from '../endpoints/databases.js';
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
const DATA_SOURCES_PER_PAGE = 100;

/**
 * Retrieves all data sources shared with the integration, following every page.
 * A database has one data source, or more if the user added them; each is listed on its own.
 * The popup shows them as the databases to upload to.
 * @throws {Error} If the access token is missing or invalid.
 * @returns {Promise<Object[]>} A list of data sources, each with an `id` and a `title`.
 */
export const getDataSources = async () =>
  fetchAllPages(async (startCursor) => {
    const response = await search({
      filter: {
        value: 'data_source',
        property: 'object',
      },
      page_size: DATA_SOURCES_PER_PAGE,
      start_cursor: startCursor,
    });

    return {
      items: response.results,
      nextCursor: response.has_more ? response.next_cursor : null,
    };
  });

/**
 * Returns the data source to upload to.
 * Before Notion-Version 2025-09-03, the popup saved the database ID. That selection is moved
 * to its data source once, if the database has only one.
 * @throws {SetupRequiredException} If no database is selected, or the saved database does not
 *   have exactly one data source, so the user has to choose one.
 * @returns {Promise<string>} The data source ID.
 */
const getUploadDataSourceId = async () => {
  const dataSourceId = await getChromeStorage('notionUploadedDataSourceId');
  if (dataSourceId) {
    return dataSourceId;
  }

  const databaseId = await getChromeStorage('notionUploadedDatabaseId');
  if (!databaseId) {
    throw new SetupRequiredException('Notion', 'database');
  }

  let database;
  try {
    database = await getDatabase(databaseId);
  } catch (e) {
    // The database is no longer shared with the integration, or was deleted.
    if (e.status === 404) {
      throw new SetupRequiredException('Notion', 'database-again', {
        cause: e,
      });
    }
    throw e;
  }

  const dataSources = database?.data_sources ?? [];
  if (dataSources.length !== 1) {
    throw new SetupRequiredException('Notion', 'database-again');
  }

  await setChromeStorage('notionUploadedDataSourceId', dataSources[0].id);
  return dataSources[0].id;
};

/**
 * Finds the latest page of a problem in the data source by its URL property.
 * @param {string} dataSourceId - The data source to search.
 * @param {string} url - The problem URL.
 * @returns {Promise<?Object>} The page, or null if the problem was not uploaded yet.
 */
const findProblemPage = async (dataSourceId, url) => {
  const response = await queryDataSource(dataSourceId, {
    filter: { property: 'URL', url: { equals: url } },
    sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    page_size: 1,
  });

  return response.results[0] ?? null;
};

/**
 * Checks whether the problem page already has the source code.
 * @param {string} dataSourceId - The data source to search.
 * @param {string} url - The problem URL.
 * @param {string} sourceCode - The source code that was uploaded.
 * @returns {Promise<?string>} The URL of the page, or null if the page does not have the source code.
 */
const findUploadedPageUrl = async (dataSourceId, url, sourceCode) => {
  const page = await findProblemPage(dataSourceId, url);
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
  const dataSourceId = await getUploadDataSourceId();

  const pageData = createProblemPageData({
    dataSourceId,
    ...payload,
    ...problemInfo,
  });

  const problemUrl = pageData.properties.URL.url;

  try {
    const existingPage = await findProblemPage(dataSourceId, problemUrl);
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
      dataSourceId,
      problemUrl,
      payload.sourceCode,
    );
    if (uploadedPageUrl) {
      return uploadedPageUrl;
    }
    throw e;
  }
};
