/**
 * Get the file extension to the language parsing the result table.
 *
 * @throws {Error} If the result table is not found or the language is not supported.
 * @returns {string} The file extension corresponding to the language.
 */
function parsingExtension() {
  const resultTable = $("table tbody tr td");
  if (util.isEmpty(resultTable)) {
    throw new Error("Not found result table");
  }

  const language = resultTable[7].innerHTML;
  const extension = languages[language];
  if (!extension) {
    throw new Error(`Not supported language (${language})`);
  }

  return extension;
}

/**
 * Parse the source code from a textarea element.
 *
 * @returns {string} The parsed source code.
 * @throws {Error} If the textarea element with the name 'source' is not found.
 */
function parsingSourceCode() {
  const textarea = $("textarea[name='source']");
  if (util.isEmpty(textarea)) {
    throw new Error("Not found source code");
  }

  return textarea[0].value;
}

function parsingTitle() {
  const resultTable = $("table tbody tr td");
  if (util.isEmpty(resultTable)) {
    throw new Error("Not found result table");
  }

  return resultTable[3].innerHTML;
}

/**
 * Parse the problem ID from result table.
 *
 * @returns {string} The problem ID parsed from the anchor tag.
 * @throws {Error} If no anchor tag with a href attribute starting with '/problem/' is found.
 */
function parsingProblemID() {
  const a = $("table a[href^='/problem/']");
  if (util.isEmpty(a)) {
    throw new Error("Not found problem ID");
  }

  return a[0].innerHTML;
}

/**
 * Parse the CodeMirror theme from CodeMirror.
 *
 * @returns {string} The name of the CodeMirror theme.
 * @throws {Error} Throws an error if CodeMirror element is not found.
 */
function parsingCodeMirrorTheme() {
  const codeMirror = $(".CodeMirror");
  if (util.isEmpty(codeMirror)) {
    throw new Error("Not found codemirror");
  }

  codeMirror[0].classList.forEach((className) => {
    if (className.startsWith("cm-s")) {
      return className;
    }
  });

  return "cm-s-default";
}
