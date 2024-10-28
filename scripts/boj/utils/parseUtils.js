/**
 * Extracts row data from a table row element.
 *
 * @param {HTMLElement} row The table row element.
 * @returns {Object} An object containing extracted data from the row.
 */
const extractRowData = (row) => {
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
const parsingExtension = () => {
  const LANGUAGE_COLUMN_INDEX = 7;
  const resultTable = $('table tbody tr td');
  const language = resultTable?.[LANGUAGE_COLUMN_INDEX]?.innerHTML;
  if (util.isEmpty(language)) {
    throw new parseException('Result table or column not found.');
  }

  const extension = languages[language];
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
const parsingLoginID = () => {
  const username = $('.username');
  const loginID = username?.text();
  if (util.isEmpty(loginID)) {
    throw new parseException(
      'Login ID not found. Please log in and try again.',
    );
  }

  return loginID;
};

/**
 * Parse the source code from a textarea element.
 *
 * @returns {string} The parsed source code.
 * @throws {Error} If the textarea element with the name 'source' is not found.
 */
const parsingSourceCode = () => {
  const textarea = $("textarea[name='source']");
  const sourceCode = textarea?.[0]?.value;
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
const parsingStatusTable = () => {
  const statusTable = $('#status-table');
  if (!statusTable) {
    throw new parseException('Status table not found.');
  }

  return statusTable;
};

const parsingTitle = () => {
  const TITLE_COLUMN_INDEX = 3;
  const resultTable = $('table tbody tr td');
  const title = resultTable?.[TITLE_COLUMN_INDEX]?.innerHTML;
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
const parsingProblemID = () => {
  const a = $("table a[href^='/problem/']");
  const problemId = a?.[0]?.innerHTML;
  if (util.isEmpty(problemId)) {
    throw new parseException('Problem ID not found.');
  }

  return problemId;
};

/**
 * Parse the CodeMirror theme from CodeMirror.
 *
 * @returns {string} The name of the CodeMirror theme.
 * @throws {Error} Throws an error if CodeMirror element is not found.
 */
const parsingCodeMirrorTheme = () => {
  const codeMirror = $('.CodeMirror');
  if (util.isEmpty(codeMirror)) {
    throw new parseException('Codemirror not found.');
  }

  codeMirror[0].classList.forEach((className) => {
    if (className.startsWith('cm-s')) {
      return className;
    }
  });

  return 'cm-s-default';
};

/**
 * Processes rows of a status table.
 *
 * @param {HTMLElement} statusTable The DOM element representing the status table.
 * @returns {Array} An array of objects containing extracted data from each row.
 */
const processRows = (statusTable, loginID) => {
  const rows = $(statusTable).find('tbody tr').toArray();
  const rowData = rows
    .map(extractRowData)
    .filter((row) => row.isCorrect && row.submitId == loginID);
  return rowData;
};
