/**
 * Parses the problem ID from the first anchor tag within a table that has a href attribute starting with '/problem/'.
 * If no anchor tag is found, it throws an error.
 * @returns {string} The problem ID parsed from the anchor tag.
 * @throws {Error} If no anchor tag with a href attribute starting with '/problem/' is found.
 */
function parsingProblemID() {
  const a = $("table a[href^='/problem/']");
  if (!a) {
    throw new Error("Not found problem ID");
  }
  return a[0].innerHTML;
}
