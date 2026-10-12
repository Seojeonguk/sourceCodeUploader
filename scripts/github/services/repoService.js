import { GITHUB_CONFIG } from '../config/config.js';

import {
  DuplicateResourceException,
  SetupRequiredException,
} from '../../common/exception/index.js';

import {
  createGithubAuthHeader,
  request,
  getChromeStorage,
  encodeBase64Unicode,
  fetchAllPages,
  logger,
} from '../../common/utils/index.js';

import { createUploadPath, encodeGithubContentPath } from '../utils/path.js';

// The maximum page size of the GitHub REST API. The default is 30.
const REPOSITORIES_PER_PAGE = 100;

/**
 * Retrieves all repositories of the authenticated user, following every page.
 * @throws {SetupRequiredException} If the user has not logged in to GitHub.
 * @returns {Promise<Object[]>} A list of repositories belonging to the authenticated user.
 */
export const getAuthenticatedUserRepositories = async () => {
  const githubAccessToken = await getChromeStorage('githubAccessToken');
  if (!githubAccessToken) {
    throw new SetupRequiredException('GitHub', 'login');
  }

  const headers = createGithubAuthHeader(githubAccessToken);

  return fetchAllPages(async (page = 1) => {
    const params = new URLSearchParams({
      type: 'owner',
      per_page: REPOSITORIES_PER_PAGE,
      page,
    });
    const url = `${GITHUB_CONFIG.API_BASE_URL}/user/repos?${params}`;

    const repositories = await request(url, 'GET', headers, undefined);

    // A full page means there can be more repositories on the next page.
    return {
      items: repositories,
      nextCursor:
        repositories.length === REPOSITORIES_PER_PAGE ? page + 1 : null,
    };
  });
};

/**
 * Commits the provided source code to the specified GitHub repository.
 * @param {Object} payload - The payload containing details about the commit.
 * @param {string} payload.extension - The file extension of the source code.
 * @param {string} payload.problemId - The unique ID of the problem or task.
 * @param {string} payload.sourceCode - The source code to commit.
 * @param {string} payload.type - The type or category of the problem.
 * @param {string} payload.title - The commit message.
 * @throws {SetupRequiredException} If the user has not logged in or selected a repository.
 * @throws {DuplicateResourceException} If the new content is identical to the existing file content.
 * @returns {Promise<string>} The URL of the committed file or an error message.
 */
export const commit = async (payload) => {
  const githubAccessToken = await getChromeStorage('githubAccessToken');
  const githubID = await getChromeStorage('githubID');
  // The GitHub ID is saved with the access token, so log in again if it is missing.
  if (!githubAccessToken || !githubID) {
    throw new SetupRequiredException('GitHub', 'login');
  }

  const githubUploadedRepository = await getChromeStorage(
    'githubUploadedRepository',
  );
  if (!githubUploadedRepository) {
    throw new SetupRequiredException('GitHub', 'repository');
  }

  const { extension, problemId, sourceCode, type, title } = payload;
  const encodeNewSourceCode = encodeBase64Unicode(sourceCode);
  const path = createUploadPath({ type, title, problemId, extension });
  const encodedPath = encodeGithubContentPath(path);
  const url =
    `${GITHUB_CONFIG.API_BASE_URL}/repos/` +
    `${githubID}/${githubUploadedRepository}/contents/${encodedPath}`;
  const headers = createGithubAuthHeader(githubAccessToken);

  let existingFile = { sha: null, content: null };
  try {
    existingFile = await request(url, 'GET', headers, undefined);
  } catch (e) {
    if (e.status === 404) {
      logger.warn('File not found. Creating a new file.');
    } else {
      throw e;
    }
  }
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
