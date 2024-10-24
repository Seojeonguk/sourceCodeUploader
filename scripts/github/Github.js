import * as Github from './constants.js';
import * as Util from '../util.js';

/**
 * Dispatches an action with an optional payload to the appropriate handler function.
 *
 * @param {string} action - The action to be dispatched.
 * @param {Object} payload - The optional payload associated with the action.
 */
const dispatch = async (action, payload) => {
  if (action === Github.OPEN_OAUTH_PAGE) {
    openOauthPage();
  } else if (action === Github.REQUEST_AND_SAVE_ACCESS_TOKEN) {
    const accessToken = await requestAndSaveAccessToken(payload);
    getAuthenticatedUserInfo(accessToken);
  } else if (action === Github.GET_REPOSITORIES) {
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
  const url = `${Github.API_BASE_URL}/repos/${githubID}/${uploadedRepository}/contents/${path}`;
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

  const url = `${Github.API_BASE_URL}/user/repos?type=owner`;
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
 * Retrieves authenticated user information.
 *
 * @param {string} accessToken - The access token for authentication.
 * @throws {Error} If the access token is falsy or if the API request fails.
 */
const getAuthenticatedUserInfo = async (accessToken) => {
  if (Util.isEmpty(accessToken)) {
    throw new Error(Github.ERROR[Github.INVALID_ACCESS_TOKEN]);
  }

  const url = `${Github.API_BASE_URL}/user`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  const response = await Util.request(url, 'GET', headers, undefined);
  if (!response.ok) {
    throw new Error(Github.ERROR[Github.FETCH_API_FAILED]);
  }

  const json = await response.json();
  const githubID = json.login;
  if (Util.isEmpty(githubID)) {
    throw new Error(Github.ERROR[Github.NOT_FOUND_GITHUB_ID]);
  }

  chrome.storage.local.set({ githubID: githubID });
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
  const url = `${Github.API_BASE_URL}/repos/${githubID}/${uploadedRepository}/contents/${path}`;
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

/**
 * Opens the GitHub OAuth authorization page in a new browser tab.
 */
const openOauthPage = () => {
  let parameters = `client_id=${Github.CLIENT_ID}`;
  if (Github.REDIRECT_URL) {
    parameters += `&redirect_url=${Github.REDIRECT_URL}`;
  }
  if (Github.SCOPES) {
    parameters += `&scope=${Github.SCOPES[0]}`;
  }
  const url = `${Github.BASE_URL}/login/oauth/authorize?${parameters}`;

  chrome.tabs.create({ url: url });
};

/**
 * Requests and saves an access token.
 * Upon successful retrieval, the access token is saved to the local storage.
 *
 * @param {Object} payload - The payload containing the authorization code.
 * @param {string} payload.code - The code for authorization.
 * @returns {string} - The access token authenticated user.
 * @throws {Error} If the payload object is invalid or if the code is missing or invalid.
 * @throws {Error} If the API request fails or if the access token is not found in the response.
 */
const requestAndSaveAccessToken = async (payload) => {
  if (Util.isEmpty(payload)) {
    throw new Error(Github.ERROR[Github.INVALID_PAYLOAD]);
  }

  const { code } = payload;
  if (Util.isEmpty(code)) {
    throw new Error(Github.ERROR[Github.INVALID_CODE]);
  }

  const url = `${Github.BASE_URL}/login/oauth/access_token`;

  const data = new FormData();
  data.append('client_id', Github.CLIENT_ID);
  data.append('client_secret', Github.CLIENT_SECRET);
  data.append('code', code);

  const response = await Util.request(url, 'POST', undefined, data);
  if (!response.ok) {
    throw new Error(Github.ERROR[Github.FETCH_API_FAILED]);
  }

  const text = await response.text();
  const matchResult = text.match(/access_token=([^&]*)/);

  if (Util.isEmpty(matchResult) || matchResult.length < 2) {
    throw new Error(Github.ERROR[Github.NOT_FOUND_ACCESS_TOKEN]);
  }

  const accessToken = matchResult[1];
  chrome.storage.local.set({ githubAccessToken: accessToken });

  Util.closeLatestTab();

  return accessToken;
};

export { dispatch };
