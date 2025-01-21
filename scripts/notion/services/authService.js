import { NOTION_CONFIG } from "../config/config.js";

export const openOauthPage = () => {
  let parameters = `owner=user&client_id=${NOTION_CONFIG.CLIENT_ID}&response_type=code`;
  if (NOTION_CONFIG.REDIRECT_URL) {
    parameters += `&redirect_uri=${NOTION_CONFIG.REDIRECT_URL}`;
  }

  const url = `${NOTION_CONFIG.API_BASE_URL}/v1/oauth/authorize?${parameters}`;

  chrome.tabs.create({ url: url });
};
