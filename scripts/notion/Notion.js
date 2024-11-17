import * as Notion from "./constants.js";
import * as SolvedAC from "../solvedAC/SolvedAC.js";
import * as Util from "../util.js";
import { createPage } from "./endpoints/pages.js";
import { createBlock } from "./objects/block.js";
import { BLOCK_TYPE } from "./objects/constants/blockConstants.js";
import { PROPERTY_TYPE } from "./objects/constants/pageConstants.js";
import { createPageProperty } from "./objects/page.js";

/**
 * Dispatches an action with an optional payload to the appropriate handler function.
 *
 * @param {string} action - The action to be dispatched.
 * @param {Object} payload - The optional payload associated with the action.
 */
const dispatch = async (action, payload) => {
  if (action === Notion.OPEN_OAUTH_PAGE) {
    openOauthPage();
  } else if (action === Notion.REQUEST_AND_SAVE_ACCESS_TOKEN) {
    const accessToken = await requestAndSaveAccessToken(payload);
  } else if (action === Notion.GET_DATABASES) {
    return await getDatabases();
  } else if (action === Notion.UPLOAD) {
    const problemInfo = await SolvedAC.fetchProblemByID(payload);
    return await upload(payload, problemInfo);
  }
};

const getDatabases = async () => {
  const accessToken = await Util.getChromeStorage('notionAccessToken');
  if (!accessToken) {
    throw new Error(Notion.ERROR[Notion.INVALID_ACCESS_TOKEN]);
  }

  const url = `${Notion.API_BASE_URL}/v1/search`;

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  };

  const body = JSON.stringify({
    filter: {
      value: 'database',
      property: 'object',
    },
  });

  const response = await Util.request(url, 'POST', headers, body);
  if (!response.ok) {
    throw new Error(Notion.ERROR[Notion.FETCH_API_FAILED]);
  }

  const json = await response.json();
  const results = json.results;

  return results;
};

/**
 * Opens the Notion OAuth page in a new tab.
 */
const openOauthPage = () => {
  let parameters = `owner=user&client_id=${Notion.CLIENT_ID}&response_type=code`;
  if (Notion.REDIRECT_URL) {
    parameters += `&redirect_uri=${Notion.REDIRECT_URL}`;
  }

  const url = `${Notion.API_BASE_URL}/v1/oauth/authorize?${parameters}`;

  chrome.tabs.create({ url: url });
};

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
const requestAndSaveAccessToken = async (payload) => {
  if (!payload) {
    throw new Error(Notion.ERROR[Notion.INVALID_PAYLOAD]);
  }

  const { code } = payload;
  if (!code) {
    throw new Error(Notion.ERROR[Notion.INVALID_CODE]);
  }

  const url = `${Notion.API_BASE_URL}/v1/oauth/token`;

  const data = JSON.stringify({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: 'https://github.com',
  });

  const encoded = btoa(`${Notion.CLIENT_ID}:${Notion.CLIENT_SECRET}`);

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Basic ${encoded}`,
  };

  const response = await Util.request(url, 'POST', headers, data);
  if (!response.ok) {
    throw new Error(Notion.ERROR[Notion.FETCH_API_FAILED]);
  }

  const json = await response.json();

  const accessToken = json.access_token;
  if (!accessToken) {
    throw new Error(Notion.ERROR[Notion.NOT_FOUND_ACCESS_TOKEN]);
  }

  Util.setChromeStorage('notionAccessToken', accessToken);

  Util.closeLatestTab();

  return accessToken;
};

const upload = async (
  { problemId, type, extension, sourceCode },
  { title, level, tags },
) => {
  const databaseId = await Util.getChromeStorage('notionUploadedDatabaseId');

  const properties = {
    title: createPageProperty(PROPERTY_TYPE.TITLE, {
      text: title,
    }),
    info: createPageProperty(PROPERTY_TYPE.MULTI_SELECT, {
      selections: [type, level, problemId].map((value) => ({
        name: value,
      })),
    }),
    tags: createPageProperty(PROPERTY_TYPE.MULTI_SELECT, {
      selections: tags.map((tag) => ({
        name: tag,
      })),
    }),
    URL: createPageProperty(PROPERTY_TYPE.URL, {
      url: `acmicpc.net/problem/${problemId}`,
    }),
    Date: createPageProperty(PROPERTY_TYPE.DATE, {
      start: new Date(),
    }),
    mime: createPageProperty(PROPERTY_TYPE.SELECT, {
      name: extension,
    }),
  };

  const children = [
    createBlock(BLOCK_TYPE.HEADING_LARGE, { text: 'How to resolve?' }),
    createBlock(BLOCK_TYPE.PARAGRAPH, { text: '' }),
    createBlock(BLOCK_TYPE.HEADING_LARGE, { text: 'Source Code' }),
    createBlock(BLOCK_TYPE.CODE, { text: sourceCode, language: 'java' }),
  ];

  const data = {
    parent: { database_id: databaseId },
    properties: properties,
    children: children,
  };

  const result = await createPage(data);
  const message = result.public_url;

  return { ok: true, message };
};

export { dispatch };
