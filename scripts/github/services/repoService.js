import { GITHUB_CONFIG } from '../config/config.js';

import {
  DuplicateResourceException,
  SetupRequiredException,
  TimeoutException,
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
import { getAccessToken } from './tokenService.js';

// The maximum page size of the GitHub REST API. The default is 30.
const REPOSITORIES_PER_PAGE = 100;

/**
 * Reads a file of the repository.
 * @param {string} url - The contents API URL of the file.
 * @param {Object} headers - The GitHub auth headers.
 * @returns {Promise<?Object>} The file with its `sha`, base64 `content` and `html_url`, or null if there is none.
 */
const getFile = async (url, headers) => {
  try {
    return await request(url, 'GET', headers, undefined);
  } catch (e) {
    if (e.status === 404) {
      return null;
    }
    throw e;
  }
};

// The contents API returns the content in base64 with a line break every 60 characters.
const isSameContent = (file, encodedContent) =>
  file?.content?.replaceAll(/\n/g, '') === encodedContent;

/**
 * Reads every page of a GitHub list that answers `{ [key]: items }`.
 * @param {string} path - The API path, such as `/user/installations`.
 * @param {string} key - The field of the items, such as `installations`.
 * @param {Object} headers - The GitHub auth headers.
 * @returns {Promise<Object[]>} All the items.
 */
const getAllItems = (path, key, headers) =>
  fetchAllPages(async (page = 1) => {
    const params = new URLSearchParams({
      per_page: REPOSITORIES_PER_PAGE,
      page,
    });
    const url = `${GITHUB_CONFIG.API_BASE_URL}${path}?${params}`;

    const items = (await request(url, 'GET', headers, undefined))?.[key] ?? [];

    // A full page means there can be more items on the next page.
    return {
      items,
      nextCursor: items.length === REPOSITORIES_PER_PAGE ? page + 1 : null,
    };
  });

/**
 * Retrieves the user's own repositories that the GitHub App is installed on.
 * The token of the App can reach only those, so they are the ones to upload to.
 * @throws {SetupRequiredException} If the user has not logged in to GitHub.
 * @returns {Promise<Object[]>} The repositories, which is empty until the App is installed.
 */
export const getAuthenticatedUserRepositories = async () => {
  const headers = createGithubAuthHeader(await getAccessToken());
  const githubID = await getChromeStorage('githubID');

  const installations = await getAllItems(
    '/user/installations',
    'installations',
    headers,
  );
  const repositories = await Promise.all(
    installations.map(({ id }) =>
      getAllItems(
        `/user/installations/${id}/repositories`,
        'repositories',
        headers,
      ),
    ),
  );

  // The upload path is `{githubID}/{repository}`, so only the user's own repositories are listed.
  return repositories.flat().filter(({ owner }) => owner?.login === githubID);
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
  const githubAccessToken = await getAccessToken();
  const githubID = await getChromeStorage('githubID');
  // The GitHub ID is saved with the access token, so log in again if it is missing.
  if (!githubID) {
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

  const existingFile = await getFile(url, headers);
  if (!existingFile) {
    logger.warn('File not found. Creating a new file.');
  }

  if (isSameContent(existingFile, encodeNewSourceCode)) {
    throw new DuplicateResourceException('Github', 'content');
  }

  const body = JSON.stringify({
    content: encodeNewSourceCode,
    message: title,
    sha: existingFile?.sha ?? null,
  });

  try {
    const response = await request(url, 'PUT', headers, body);
    return response?.commit?.html_url ?? response.message;
  } catch (e) {
    // The App token cannot reach a repository the App is not installed on, and GitHub
    // answers 404 for it, such as for a repository selected with the old OAuth App.
    if (e.status === 404) {
      throw new SetupRequiredException('GitHub', 'app-install');
    }
    if (!(e instanceof TimeoutException && e.mayBeApplied)) {
      throw e;
    }

    // GitHub may have committed the file before the timeout, so check the file before reporting a failure.
    const uploadedFile = await getFile(url, headers);
    if (isSameContent(uploadedFile, encodeNewSourceCode)) {
      return uploadedFile.html_url;
    }
    throw e;
  }
};
