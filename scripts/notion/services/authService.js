import { closeLatestTab, request } from "../../common/utils/index.js";
import { NOTION_CONFIG } from "../config/config.js";

import {
  InvalidRequestException,
  NotFoundException,
} from '../../common/exception/index.js';

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
    throw new InvalidRequestException('Notion', 'code');
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
    throw new NotFoundException('Notion', 'access token');
  }

  closeLatestTab();

  return accessToken;
};
