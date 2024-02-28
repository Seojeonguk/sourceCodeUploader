import * as Github from "./constants.js";
import * as Util from "../util.js";

async function dispatch(action, payload) {
  if (action === Github.OPEN_OAUTH_PAGE) {
    openGithubOauthPage();
  } else if (action === Github.REQUEST_AND_SAVE_ACCESS_TOKEN) {
    requestAndSaveAccessToken(payload);
  }
}
/**
 * Opens the GitHub OAuth authorization page in a new browser tab.
 * The authorization page URL is constructed using the GitHub client ID,
 * optional redirect URL, and optional scopes. If the redirect URL or scopes
 * are provided, they are appended to the authorization page URL as query parameters.
 */
function openGithubOauthPage() {
  let parameters = `client_id=${Github.CLIENT_ID}`;
  if (Github.REDIRECT_URL) {
    parameters += `&redirect_url=${Github.REDIRECT_URL}`;
  }
  if (Github.SCOPES) {
    parameters += `&scope=${Github.SCOPES[0]}`;
  }
  const url = `${Github.BASE_URL}/login/oauth/authorize?${parameters}`;

  chrome.tabs.create({ url: url });
}

/**
 * Requests an access token from the GitHub API using the provided payload,
 * which should contain a code obtained from the OAuth authorization flow.
 * Upon successful retrieval, the access token is saved to the local storage.
 *
 * @param {Object} payload - The payload containing the authorization code.
 * @throws {Error} If the payload object is invalid or if the code is missing or invalid.
 * @throws {Error} If the API request fails or if the access token is not found in the response.
 */
async function requestAndSaveAccessToken(payload) {
  Util.throwIfFalsy(
    payload,
    "Invalid payload object for reqeusting access token."
  );
  const { code } = payload;
  Util.throwIfFalsy(code, "Invalid code for requesting access token.");

  const url = `${Github.BASE_URL}/login/oauth/access_token`;

  const data = new FormData();
  data.append("client_id", Github.CLIENT_ID);
  data.append("client_secret", Github.CLIENT_SECRET);
  data.append("code", code);

  const response = await Util.request(url, "POST", undefined, data);
  if (!response.ok) {
    throw new Error("Failed to fetch access token.");
  }

  const text = await response.text();
  const matchResult = text.match(/access_token=([^&]*)/);

  if (Util.isEmpty(matchResult) || matchResult.length < 2) {
    throw new Error("Access token not found.");
  }

  const accessToken = matchResult[1];
  chrome.storage.local.set({ githubAccessToken: accessToken });
}

export { dispatch };
