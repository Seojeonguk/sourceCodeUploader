import * as Notion from "./constants.js";
import * as Util from "../util.js";

/**
 * Dispatches an action with an optional payload to the appropriate handler function.
 *
 * @param {string} action - The action to be dispatched.
 * @param {Object} payload - The optional payload associated with the action.
 */
async function dispatch(action, payload) {
  try {
    if (action === Notion.OPEN_OAUTH_PAGE) {
      openOauthPage();
    } else if (action === Notion.REQUEST_AND_SAVE_ACCESS_TOKEN) {
      const accessToken = await requestAndSaveAccessToken(payload);
    }
  } catch (e) {
    throw e;
  }
}

/**
 * Opens the Notion OAuth page in a new tab.
 */
function openOauthPage() {
  let parameters = `owner=user&client_id=${Notion.CLIENT_ID}&response_type=code`;
  if (Notion.REDIRECT_URL) {
    parameters += `&redirect_uri=${Notion.REDIRECT_URL}`;
  }

  const url = `${Notion.API_BASE_URL}/v1/oauth/authorize?${parameters}`;

  chrome.tabs.create({ url: url });
}

/**
 * Requests and saves an access token.
 * Upon successful retrieval, the relavant information is saved to the local storage.
 *
 * @param {Object} payload - The payload containing the authorization code.
 * @param {string} payload.code - The code for authorization.
 * @returns {string} - The access token authenticated user.
 * @throws {Error} If the payload object is invalid or if the code is missing or invalid.
 * @throws {Error} If the API request fails or if the access token is not found in the response.
 */
async function requestAndSaveAccessToken(payload) {
  if (Util.isEmpty(payload)) {
    throw new Error("Invalid payload object for reqeusting access token.");
  }

  const { code } = payload;
  if (Util.isEmpty(code)) {
    throw new Error("Invalid code for requesting access token.");
  }

  const url = `${Notion.API_BASE_URL}/v1/oauth/token`;

  const data = JSON.stringify({
    grant_type: "authorization_code",
    code: code,
    redirect_uri: "https://github.com",
  });

  const encoded = btoa(`${Notion.CLIENT_ID}:${Notion.CLIENT_SECRET}`);

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Basic ${encoded}`,
  };

  const response = await Util.request(url, "POST", headers, data);
  if (!response.ok) {
    throw new Error("Failed to fetch access token.");
  }

  const json = await response.json();

  const accessToken = json.access_token;
  if (Util.isEmpty(accessToken)) {
    throw new Error("Access token not found.");
  }

  const botId = json.bot_id;
  const workspaceId = json.workspace_id;
  const workspaceName = json.workspace_name;

  Util.setChromeStorage("notionAccessToken", accessToken);
  Util.setChromeStorage("notionBotId", botId);
  Util.setChromeStorage("notionWorkspaceId", workspaceId);
  Util.setChromeStorage("notionWorkspaceName", workspaceName);

  Util.closeLatestTab();

  return accessToken;
}

export { dispatch };
