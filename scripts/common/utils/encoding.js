// The number of bytes passed to String.fromCharCode() at once.
// Spreading every byte of a large source at once exceeds the call stack.
const CHUNK_SIZE = 0x8000;

/**
 * Encodes a string to base64 as UTF-8, so non-Latin1 text such as Korean can be encoded.
 * @param {string} str - The string to encode.
 * @returns {string} The base64 string.
 */
export const encodeBase64Unicode = (str) => {
  const bytes = new TextEncoder().encode(str);

  let binaryString = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binaryString += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
  }

  return btoa(binaryString);
};
