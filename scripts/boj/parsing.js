/**
 * Parses the source code from a textarea element.
 *
 * @returns {string} The parsed source code.
 * @throws {Error} If the textarea element with the name 'source' is not found.
 */
function parsingSourceCode() {
  const textarea = $("textarea[name='source']");
  if (textarea.length == 0) {
    throw new Error("Not found source code");
  }
  return textarea[0].value;
}

/**
 * Parses the problem ID from the first anchor tag within a table that has a href attribute starting with '/problem/'.
 * If no anchor tag is found, it throws an error.
 * @returns {string} The problem ID parsed from the anchor tag.
 * @throws {Error} If no anchor tag with a href attribute starting with '/problem/' is found.
 */
function parsingProblemID() {
  const a = $("table a[href^='/problem/']");
  if (a.length == 0) {
    throw new Error("Not found problem ID");
  }
  return a[0].innerHTML;
}
