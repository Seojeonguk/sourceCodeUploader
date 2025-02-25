import * as Util from "../../util.js";
import { DuplicateResourceException } from "../../common/exception/DuplicateResourceException.js";
import { InvalidRequestException } from "../../common/exception/InvalidRequestException.js";
import { createGithubAuthHeader, request } from "../../utils/fetchUtils.js";
import { GITHUB_CONFIG } from "../config/config.js";

/**
 * Retrieves the repositories of the authenticated user.
 * @throws {Error} If the access token is missing or invalid.
 * @returns {Promise<Object[]>} A list of repositories belonging to the authenticated user.
 */
export const getAuthenticatedUserRepositories = async () => {
  const githubAccessToken = await Util.getChromeStorage('githubAccessToken');
  if (!githubAccessToken) {
    throw new InvalidRequestException('Github', 'access token');
  }

  const url = `${GITHUB_CONFIG.API_BASE_URL}/user/repos?type=owner`;
  const headers = createGithubAuthHeader(githubAccessToken);

  const response = await request(url, 'GET', headers, undefined);
  return response;
};

/**
 * Commits the provided source code to the specified GitHub repository.
 * @param {Object} payload - The payload containing details about the commit.
 * @param {string} payload.extension - The file extension of the source code.
 * @param {string} payload.problemId - The unique ID of the problem or task.
 * @param {string} payload.sourceCode - The source code to commit.
 * @param {string} payload.type - The type or category of the problem.
 * @param {string} payload.title - The commit message.
 * @throws {DuplicateResourceException} If the new content is identical to the existing file content.
 * @throws {Error} If authentication requirements are not met.
 * @returns {Promise<string>} The URL of the committed file or an error message.
 */
export const commit = async (payload) => {
  const githubAccessToken = await Util.getChromeStorage('githubAccessToken');
  const githubID = await Util.getChromeStorage('githubID');
  const githubUploadedRepository = await Util.getChromeStorage(
    'githubUploadedRepository',
  );

  const { extension, problemId, sourceCode, type, title } = payload;
  const encodeNewSourceCode = Util.encodeBase64Unicode(sourceCode);
  const path = `${type}/${problemId}.${extension}`;
  const url = `${GITHUB_CONFIG.API_BASE_URL}/repos/${githubID}/${githubUploadedRepository}/contents/${path}`;
  const headers = createGithubAuthHeader(githubAccessToken);

  const existingFile = await request(url, 'GET', headers, undefined);
  const { sha, content } = existingFile;
  const sanitizedContent = content?.replaceAll(/\n/g, '');

  if (sanitizedContent === encodeNewSourceCode) {
    throw new DuplicateResourceException('Github', 'content');
  }

  const body = JSON.stringify({
    content: encodeNewSourceCode,
    message: title,
    sha,
  });

  const response = await request(url, 'PUT', headers, body);
  const message = response?.commit?.html_url ?? response.message;

  return message;
};
