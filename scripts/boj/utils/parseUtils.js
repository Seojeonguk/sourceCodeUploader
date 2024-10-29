/**
 * Extracts row data from a table row element.
 *
 * @param {HTMLElement} row The table row element.
 * @returns {Object} An object containing extracted data from the row.
 */
const parseSubmissionRowData = (row) => {
  const submitNum = $(row).find('td:eq(0)').text();
  const submitId = $(row).find('td:eq(1)').text();
  const problemId = $(row).find('td:eq(2) a').text();
  const isCorrect = $(row).find('td:eq(3) span').hasClass('result-ac');
  const submitLanguage = $(row).find('td:eq(6) a:eq(0)').text();
  const resultTag = $(row).find('td:eq(3)')?.[0];
  const title = $(row).find('td:eq(2) a').attr('data-original-title');

  return {
    submitNum,
    submitId,
    problemId,
    isCorrect,
    submitLanguage,
    resultTag,
    title,
  };
};

/**
 * Get the file extension to the language parsing the result table.
 *
 * @throws {Error} If the result table is not found or the language is not supported.
 * @returns {string} The file extension corresponding to the language.
 */
const getSubmissionLanguageFileExtension = () => {
  const LANGUAGE_COLUMN_INDEX = 7;
  const resultTable = safeQuerySelector(SELECTORS.RESULT_TABLE);
  const language = resultTable[LANGUAGE_COLUMN_INDEX]?.innerHTML;
  if (util.isEmpty(language)) {
    throw new parseException('Result table or column not found.');
  }

  const extension = LANGUAGES[language];
  if (!extension) {
    throw new undefinedException(`${language} is not defined.`);
  }

  return extension;
};

/**
 * Parse the login ID.
 *
 * @returns {string} The parsed login ID.
 * @throws {Error} If the login ID is not found.
 */
const getCurrentLoginId = () => {
  const loginId = safeQuerySelector(SELECTORS.LOGIN_ID);
  return safeGetText(
    loginId,
    'Login ID not found. Please log in and try again.',
  );
};

/**
 * Parse the source code from a textarea element.
 *
 * @returns {string} The parsed source code.
 * @throws {Error} If the textarea element with the name 'source' is not found.
 */
const getSubmissionSourceCode = () => {
  const textarea = safeQuerySelector(SELECTORS.SOURCE_TEXTAREA);
  const sourceCode = textarea[0]?.value;
  if (util.isEmpty(sourceCode)) {
    throw new parseException('Source code not found.');
  }
  return sourceCode;
};

/**
 * Prase the status table from the status page.
 *
 * @returns {HTMLElement} The dom element of the status table.
 * @throws {Error} If the status table is not found.
 */
const getSubmissionStatusTable = () => {
  return safeQuerySelector(SELECTORS.STATUS_TABLE);
};

const getProblemTitle = () => {
  const resultTable = safeQuerySelector(SELECTORS.RESULT_TABLE);
  const title = resultTable[INDICES.TITLE_COLUMN]?.innerHTML;
  if (util.isEmpty(title)) {
    throw new parseException('Result table not found.');
  }
  return title;
};

/**
 * Parse the problem ID from result table.
 *
 * @returns {string} The problem ID parsed from the anchor tag.
 * @throws {Error} If no anchor tag with a href attribute starting with '/problem/' is found.
 */
const getProblemId = () => {
  const a = safeQuerySelector(SELECTORS.PROBLEM_LINK);
  return safeGetText(a, 'Problem ID not found.');
};

/**
 * Parse the CodeMirror theme from CodeMirror.
 *
 * @returns {string} The name of the CodeMirror theme.
 * @throws {Error} Throws an error if CodeMirror element is not found.
 */
const getActiveEditorTheme = () => {
  const codeMirror = safeQuerySelector(SELECTORS.CODE_MIRROR);
  let theme = 'cm-s-default';

  codeMirror[0].classList.forEach((className) => {
    if (className.startsWith('cm-s')) {
      theme = className;
    }
  });

  return theme;
};

/**
 * Processes rows of a status table.
 *
 * @param {HTMLElement} statusTable The DOM element representing the status table.
 * @returns {Array} An array of objects containing extracted data from each row.
 */
const filterCorrectUserSubmissions = (statusTable, loginID) => {
  const rows = $(statusTable).find('tbody tr').toArray();
  const rowData = rows
    .map(parseSubmissionRowData)
    .filter((row) => row.isCorrect && row.submitId == loginID);
  return rowData;
};
