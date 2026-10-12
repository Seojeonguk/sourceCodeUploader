import { createBlock } from './block.js';
import { BLOCK_TYPE, CODE_LANGUAGES } from './constants/blockConstants.js';
import { PROPERTY_TYPE } from './constants/pageConstants.js';
import { createPageProperty } from './page.js';

const EXTENSION_CODE_LANGUAGES = Object.freeze({
  c: CODE_LANGUAGES.C,
  cc: CODE_LANGUAGES.CPP,
  cpp: CODE_LANGUAGES.CPP,
  cs: CODE_LANGUAGES.C_SHARP,
  go: CODE_LANGUAGES.GO,
  java: CODE_LANGUAGES.JAVA,
  js: CODE_LANGUAGES.JAVASCRIPT,
  kt: CODE_LANGUAGES.KOTLIN,
  php: CODE_LANGUAGES.PHP,
  py: CODE_LANGUAGES.PYTHON,
  rb: CODE_LANGUAGES.RUBY,
  rs: CODE_LANGUAGES.RUST,
  scala: CODE_LANGUAGES.SCALA,
  sql: CODE_LANGUAGES.SQL,
  swift: CODE_LANGUAGES.SWIFT,
  ts: CODE_LANGUAGES.TYPESCRIPT,
});

/**
 * Returns the Notion code block language for a file extension.
 * @param {string} extension - The file extension, such as `py`.
 * @returns {string} The Notion language, or `plain text` if unknown.
 */
export const getCodeLanguage = (extension) =>
  EXTENSION_CODE_LANGUAGES[String(extension ?? '').toLowerCase()] ??
  CODE_LANGUAGES.PLAIN_TEXT;

/**
 * Creates the request body of a Notion page for a solved problem.
 * @param {Object} param
 * @param {string} param.databaseId - The database to create the page in.
 * @param {string} param.type - The platform, such as `Programmers`.
 * @param {string} param.problemId - The problem ID.
 * @param {string} param.title - The problem title.
 * @param {?string} [param.level] - The problem level.
 * @param {string[]} [param.tags=[]] - The problem tags.
 * @param {?string} [param.url] - The problem URL. Defaults to the BOJ problem URL.
 * @param {string} param.extension - The file extension of the source code.
 * @param {string} param.sourceCode - The source code.
 * @param {Date} [param.createdAt=new Date()] - The date of the upload.
 * @returns {Object} The request body for creating the page.
 */
export const createProblemPageData = ({
  databaseId,
  type,
  problemId,
  title,
  level = null,
  tags = [],
  url = null,
  extension,
  sourceCode,
  createdAt = new Date(),
}) => ({
  parent: { database_id: databaseId },
  properties: {
    title: createPageProperty(PROPERTY_TYPE.TITLE, {
      text: title,
    }),
    info: createPageProperty(PROPERTY_TYPE.MULTI_SELECT, {
      selections: [type, level, problemId]
        .filter(Boolean)
        .map((value) => ({ name: String(value) })),
    }),
    tags: createPageProperty(PROPERTY_TYPE.MULTI_SELECT, {
      selections: tags.map((tag) => ({ name: tag })),
    }),
    URL: createPageProperty(PROPERTY_TYPE.URL, {
      url: url ?? `acmicpc.net/problem/${problemId}`,
    }),
    Date: createPageProperty(PROPERTY_TYPE.DATE, {
      start: createdAt,
    }),
    mime: createPageProperty(PROPERTY_TYPE.SELECT, {
      name: extension,
    }),
  },
  children: [
    createBlock(BLOCK_TYPE.HEADING_LARGE, { text: 'How to resolve?' }),
    createBlock(BLOCK_TYPE.PARAGRAPH, { text: '' }),
    createBlock(BLOCK_TYPE.HEADING_LARGE, { text: 'Source Code' }),
    createBlock(BLOCK_TYPE.CODE, {
      text: sourceCode,
      language: getCodeLanguage(extension),
    }),
  ],
});
