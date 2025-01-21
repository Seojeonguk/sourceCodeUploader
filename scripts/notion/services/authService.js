import * as Notion from "../constants/errors.js";
import * as Util from "../../util.js";
import { request } from "../../utils/fetchUtils.js";
import { NOTION_CONFIG } from "../config/config.js";

export const openOauthPage = () => {
  let parameters = `owner=user&client_id=${NOTION_CONFIG.CLIENT_ID}&response_type=code`;
  if (NOTION_CONFIG.REDIRECT_URL) {
    parameters += `&redirect_uri=${NOTION_CONFIG.REDIRECT_URL}`;
  }

  const url = `${NOTION_CONFIG.API_BASE_URL}/v1/oauth/authorize?${parameters}`;

  chrome.tabs.create({ url: url });
};

export const getAccessToken = async (payload) => {
  if (!payload?.code) {
    throw new Error(Notion.ERROR[Notion.INVALID_code]);
  }

  const { code } = payload;

  const url = `${NOTION_CONFIG.API_BASE_URL}/v1/oauth/token`;
  const data = JSON.stringify({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: NOTION_CONFIG.REDIRECT_URL,
  });

  const encoded = btoa(
    `${NOTION_CONFIG.CLIENT_ID}:${NOTION_CONFIG.CLIENT_SECRET}`,
  );

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Basic ${encoded}`,
  };

  const response = await request(url, 'POST', headers, data);
  const accessToken = response?.access_token;
  if (!accessToken) {
    console.debug(Notion.ERROR[Notion.NOT_FOUND_ACCESS_TOKEN]);
    throw new Error(Notion.ERROR[Notion.NOT_FOUND_ACCESS_TOKEN]);
  }

  Util.closeLatestTab();

  return accessToken;
};
