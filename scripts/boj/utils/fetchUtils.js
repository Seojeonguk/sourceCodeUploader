/**
 * Fetches the source code for a given submission number.
 * @param {number} submitNum - The submission number.
 * @returns {Promise<string>} The source code text.
 */
const fetchSourceCodeBySubmitNum = async (submitNum) => {
  const response = await fetch(
    `https://www.acmicpc.net/source/download/${submitNum}`,
  );

  const text = await response.text();

  return text;
};
