import { InvalidRequestException } from '../../common/exception/index.js';

/**
 * Makes a value safe to use as a file name in a GitHub repository.
 * Replaces characters that are invalid in file names, collapses whitespace,
 * and removes leading / trailing dots.
 * @param {*} value - The value to use as the file name.
 * @param {string} fallback - The file name to use when the value is empty.
 * @returns {string} The sanitized file name.
 */
export const sanitizePathSegment = (value, fallback) => {
  const sanitized = String(value || '')
    // eslint-disable-next-line no-control-regex -- strip control characters from file names
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/^\.+|\.+$/g, '')
    .trim();

  return sanitized || fallback;
};

/**
 * Encodes each segment of a path for the GitHub Contents API, keeping the slashes.
 * @param {string} path - The path to encode.
 * @returns {string} The encoded path.
 */
export const encodeGithubContentPath = (path) =>
  path.split('/').map(encodeURIComponent).join('/');

// The folders that solutions are uploaded to. The type comes from the content script,
// so other values, such as `.github/workflows`, are refused.
const UPLOAD_TYPES = Object.freeze(['Programmers', 'Codeforces']);
// The characters that the content script reads as a file extension, without `/` or `.`.
const EXTENSION_PATTERN = /^[a-z0-9+#]+$/i;

/**
 * Creates the path of the file to upload: `{type}/{title or problemId}.{extension}`.
 * @param {Object} payload
 * @param {string} payload.type - The platform of the problem.
 * @param {string} payload.title - The problem title.
 * @param {string} payload.problemId - The problem ID, used when the title is empty.
 * @param {string} payload.extension - The file extension of the source code.
 * @throws {InvalidRequestException} If the type or the extension is not one that is uploaded.
 * @returns {string} The file path.
 */
export const createUploadPath = ({ type, title, problemId, extension }) => {
  if (!UPLOAD_TYPES.includes(type)) {
    throw new InvalidRequestException('GitHub', 'type');
  }
  if (typeof extension !== 'string' || !EXTENSION_PATTERN.test(extension)) {
    throw new InvalidRequestException('GitHub', 'file extension');
  }

  // The problem ID also comes from the content script, so it is sanitized like the title.
  const fileName =
    sanitizePathSegment(title, '') ||
    sanitizePathSegment(problemId, 'solution');

  return `${type}/${fileName}.${extension}`;
};
