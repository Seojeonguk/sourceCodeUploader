import { createBlock } from './block.js';
import { BLOCK_TYPE, CODE_LANGUAGES } from './constants/blockConstants.js';
import { PROPERTY_TYPE } from './constants/pageConstants.js';
import { createPageProperty } from './page.js';

const SOURCE_CODE_HEADING = 'Source Code';

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
 * The properties a problem page sets, other than the title, by name and type.
 * The database must have them, so they are added when it does not.
 */
export const PROBLEM_PAGE_PROPERTIES = Object.freeze({
  info: PROPERTY_TYPE.MULTI_SELECT,
  tags: PROPERTY_TYPE.MULTI_SELECT,
  URL: PROPERTY_TYPE.URL,
  Date: PROPERTY_TYPE.DATE,
  mime: PROPERTY_TYPE.SELECT,
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
 * @param {string} param.dataSourceId - The data source of the database to create the page in.
 * @param {string} param.type - The platform, such as `Programmers`.
 * @param {string} param.problemId - The problem ID.
 * @param {string} param.title - The problem title.
 * @param {?string} [param.level] - The problem level.
 * @param {string[]} [param.tags=[]] - The problem tags.
 * @param {?string} [param.url] - The problem URL.
 * @param {string} param.extension - The file extension of the source code.
 * @param {string} param.sourceCode - The source code.
 * @param {Date} [param.createdAt=new Date()] - The date of the upload.
 * @returns {Object} The request body for creating the page.
 */
export const createProblemPageData = ({
  dataSourceId,
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
  parent: { type: 'data_source_id', data_source_id: dataSourceId },
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
      url,
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
    ...createSourceCodeBlocks({ sourceCode, extension }),
  ],
});

/**
 * Creates the code block of the source code.
 * @param {Object} param
 * @param {string} param.sourceCode - The source code.
 * @param {string} param.extension - The file extension of the source code.
 * @returns {Object} The code block.
 */
export const createSourceCodeBlock = ({ sourceCode, extension }) =>
  createBlock(BLOCK_TYPE.CODE, {
    text: sourceCode,
    language: getCodeLanguage(extension),
  });

/**
 * Creates the `Source Code` heading and the code block below it.
 * @param {Object} param
 * @param {string} param.sourceCode - The source code.
 * @param {string} param.extension - The file extension of the source code.
 * @returns {Object[]} The heading and the code block.
 */
export const createSourceCodeBlocks = ({ sourceCode, extension }) => [
  createBlock(BLOCK_TYPE.HEADING_LARGE, { text: SOURCE_CODE_HEADING }),
  createSourceCodeBlock({ sourceCode, extension }),
];

/**
 * Joins the text of a rich text array, such as the text of a code block.
 * @param {Object[]} [richTexts=[]] - The rich text array from the Notion API.
 * @returns {string} The plain text.
 */
export const getPlainText = (richTexts = []) =>
  richTexts.map((text) => text.plain_text ?? text.text?.content ?? '').join('');

/**
 * Finds the code block of the source code in the blocks of a problem page:
 * the first code block below the `Source Code` heading, or the first code block
 * if the heading was removed.
 * @param {Object[]} blocks - The child blocks of the page.
 * @returns {?Object} The code block, or null if the page has none.
 */
export const findSourceCodeBlock = (blocks) => {
  const headingIndex = blocks.findIndex(
    (block) =>
      block.type === BLOCK_TYPE.HEADING_LARGE &&
      getPlainText(block[block.type].rich_text) === SOURCE_CODE_HEADING,
  );

  return (
    blocks
      .slice(headingIndex + 1)
      .find((block) => block.type === BLOCK_TYPE.CODE) ?? null
  );
};

/**
 * Checks whether two source codes are the same, ignoring the line endings.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export const isSameSourceCode = (a, b) =>
  String(a).replace(/\r\n/g, '\n') === String(b).replace(/\r\n/g, '\n');
