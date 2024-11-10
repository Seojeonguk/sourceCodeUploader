import * as Github from "./constants.js";
import * as Util from "../util.js";
import { GITHUB_CONFIG } from "./config/config.js";

/**
 * Dispatches an action with an optional payload to the appropriate handler function.
 *
 * @param {string} action - The action to be dispatched.
 * @param {Object} payload - The optional payload associated with the action.
 */
const dispatch = async (action, payload) => {
  if (action === Github.GET_REPOSITORIES) {
    return await getAuthenticatedUserRepositories(payload);
  } else if (action === Github.COMMIT) {
    const response = await getShaForExistingFile(payload);
    if (response.content === Util.encodeBase64Unicode(payload.sourceCode)) {
      return {
        ok: false,
        message:
          'The upload source code and the existing content are the same.',
      };
    }
    return await commit({ ...payload, sha: response.sha });
  }
};

/**
 * Commits the source code to the GitHub repository.
 *
 * @param {object} payload - The payload containing information about the commit.
 * @param {string} payload.extension - The file extension of the source code.
 * @param {string} payload.problemId - The problem ID associated with the source code.
 * @param {string} payload.sha - The SHA value of the existing file to be updated.
 * @param {string} payload.sourceCode - The source code to be committed.
 * @param {string} payload.type - The type of the source code (e.g., 'BOJ', 'LeetCode').
 * @param {string} payload.title - The title for the commit.
 * @returns {Promise<object>} A promise that resolves with the result of the commit operation.
 */

const commit = async (payload) => {
  const accessToken = await Util.getChromeStorage('githubAccessToken');
  if (Util.isEmpty(accessToken)) {
    throw new Error(Github.ERROR[Github.INVALID_ACCESS_TOKEN]);
  }

  const githubID = await Util.getChromeStorage('githubID');
  if (Util.isEmpty(githubID)) {
    throw new Error(Github.ERROR[Github.INVALID_GITHUB_ID]);
  }

  const uploadedRepository = await Util.getChromeStorage(
    'githubUploadedRepository',
  );
  if (Util.isEmpty(uploadedRepository)) {
    throw new Error(Github.ERROR[Github.INVALID_UPLOADED_REPOSITORY]);
  }

  const { extension, problemId, sha, sourceCode, type, title } = payload;
  const path = `${type}/${problemId}.${extension}`;
  const url = `${GITHUB_CONFIG.API_BASE_URL}/repos/${githubID}/${uploadedRepository}/contents/${path}`;
  const headers = {
    accept: 'application/vnd.github+json',
    Authorization: `Bearer ${accessToken}`,
  };

  const body = JSON.stringify({
    content: Util.encodeBase64Unicode(sourceCode),
    message: title,
    sha,
  });

  const response = await Util.request(url, 'PUT', headers, body);
  const text = await response.json();
  const message = text.commit.html_url ?? text.message;

  return {
    ok: response.ok,
    message,
  };
};

/**
 * Retrieves repository list owned by the authenticated user.
 *
 * @returns {Promise<Array>} A promise that resolves to an array of repositories.
 * @throws {Error} If the access token is falsy or if the API request fails.
 */
const getAuthenticatedUserRepositories = async () => {
  const accessToken = await Util.getChromeStorage('githubAccessToken');
  if (Util.isEmpty(accessToken)) {
    throw new Error(Github.ERROR[Github.INVALID_ACCESS_TOKEN]);
  }

  const url = `${GITHUB_CONFIG.API_BASE_URL}/user/repos?type=owner`;
  const headers = {
    accept: 'application/vnd.github+json',
    Authorization: `Bearer ${accessToken}`,
  };

  const response = await Util.request(url, 'GET', headers, undefined);
  if (!response.ok) {
    throw new Error(Github.ERROR[Github.FETCH_API_FAILED]);
  }

  return await response.json();
};

/**
 * Retrieves the SHA and sanitized content for an existing file from the GitHub repository.
 *
 * @param {Object} payload - The payload containing information about the file.
 * @param {string} payload.extension - The file extension.
 * @param {string} payload.problemId - The problem ID associated with the file.
 * @param {string} payload.type - The type of the file.
 * @returns {Promise<{sha: string, content: string}>} A promise that resolves with the SHA and sanitized content of the file.
 */
const getShaForExistingFile = async (payload) => {
  const accessToken = await Util.getChromeStorage('githubAccessToken');
  if (Util.isEmpty(accessToken)) {
    throw new Error(Github.ERROR[Github.INVALID_ACCESS_TOKEN]);
  }

  const githubID = await Util.getChromeStorage('githubID');
  if (Util.isEmpty(githubID)) {
    throw new Error(Github.ERROR[Github.INVALID_GITHUB_ID]);
  }

  const uploadedRepository = await Util.getChromeStorage(
    'githubUploadedRepository',
  );
  if (Util.isEmpty(uploadedRepository)) {
    throw new Error(Github.ERROR[Github.INVALID_UPLOADED_REPOSITORY]);
  }

  const { extension, problemId, type } = payload;
  const path = `${type}/${problemId}.${extension}`;
  const url = `${GITHUB_CONFIG.API_BASE_URL}/repos/${githubID}/${uploadedRepository}/contents/${path}`;
  const headers = {
    accept: 'application/vnd.github+json',
    Authorization: `Bearer ${accessToken}`,
  };

  const response = await Util.request(url, 'GET', headers, undefined);
  const text = await response.json();

  const { sha, content } = text;
  const sanitizedContent = content?.replaceAll(/\n/g, '');

  return {
    sha,
    content: sanitizedContent,
  };
};

export { dispatch };
