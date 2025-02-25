/**
 * Extracts data from a table row element.
 * @param {HTMLElement} row - The table row element.
 * @returns {Object} An object containing the extracted data.
 */
const parseSubmissionRowData = (row) => {
  const getData = (index) => $(row).find(`td:eq(${index})`);

  return {
    submitNum: getData(STATUS_TABLE_INDICES.SUBMIT_NUM).text(),
    submitId: getData(STATUS_TABLE_INDICES.SUBMIT_ID).text(),
    problemId: getData(STATUS_TABLE_INDICES.PROBLEM_ID).find('a').text(),
    isCorrect: getData(STATUS_TABLE_INDICES.RESULT)
      .find('span')
      .hasClass('result-ac'),
    submitLanguage: getData(STATUS_TABLE_INDICES.LANGUAGE)
      .find('a:eq(0)')
      .text(),
    resultTag: getData(STATUS_TABLE_INDICES.RESULT)[0],
    title: getData(STATUS_TABLE_INDICES.PROBLEM_ID)
      .find('a')
      .attr('data-original-title'),
  };
};

/**
 * Gets the file extension for the submission language.
 * @throws {Error} If the result table is not found or the language is not supported.
 * @returns {string} The file extension for the submission language.
 */
const getSubmissionLanguageFileExtension = () => {
  const LANGUAGE_COLUMN_INDEX = 7;
  const resultTable = safeQuerySelector(SELECTORS.RESULT_TABLE);
  const language = resultTable[LANGUAGE_COLUMN_INDEX]?.innerHTML;
  if (!language) {
    throw new ParseException('Result table or column not found.');
  }

  const extension = LANGUAGES[language];
  if (!extension) {
    throw new UndefinedException(`${language} is not defined.`);
  }

  return extension;
};

/**
 * Parses the current user's login ID.
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
 * Parses the source code from a textarea element.
 * @returns {string} The parsed source code.
 * @throws {Error} If the textarea element is not found.
 */
const getSubmissionSourceCode = () => {
  const textarea = safeQuerySelector(SELECTORS.SOURCE_TEXTAREA);
  const sourceCode = textarea[0]?.value;
  if (!sourceCode) {
    throw new ParseException('Source code not found.');
  }
  return sourceCode;
};

/**
 * Parses the status table from the status page.
 * @returns {HTMLElement} The DOM element of the status table.
 * @throws {Error} If the status table is not found.
 */
const getSubmissionStatusTable = () => {
  return safeQuerySelector(SELECTORS.STATUS_TABLE);
};

/**
 * Parses the problem title from the result table.
 * @returns {string} The problem title.
 * @throws {Error} If the result table is not found.
 */
const getProblemTitle = () => {
  const TITLE_COLUMN_INDEX = 3;
  const resultTable = safeQuerySelector(SELECTORS.RESULT_TABLE);
  const title = resultTable[TITLE_COLUMN_INDEX]?.innerHTML;
  if (!title) {
    throw new ParseException('Result table not found.');
  }
  return title;
};

/**
 * Parses the problem ID from the result table.
 * @returns {string} The problem ID parsed from the anchor tag.
 * @throws {Error} If the anchor tag is not found.
 */
const getProblemId = () => {
  const a = safeQuerySelector(SELECTORS.PROBLEM_LINK);
  return safeGetText(a, 'Problem ID not found.');
};

/**
 * Parses the CodeMirror theme from the CodeMirror element.
 * @returns {string} The name of the CodeMirror theme.
 * @throws {Error} If the CodeMirror element is not found.
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
 * Filters the status table for correct user submissions.
 * @param {HTMLElement} statusTable - The DOM element of the status table.
 * @param {string} loginID - The login ID of the user.
 * @returns {Array} An array of objects containing the extracted row data.
 */
const filterCorrectUserSubmissions = (statusTable, loginID) => {
  const rows = $(statusTable).find('tbody tr').toArray();
  const rowData = rows
    .map(parseSubmissionRowData)
    .filter((row) => row.isCorrect && row.submitId == loginID);
  return rowData;
};
