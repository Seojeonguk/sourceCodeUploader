import * as Util from "../../util.js";
import { NOTION_CONFIG } from "../config/config.js";

export const createPage = async (data) => {
  const accessToken = await Util.getChromeStorage('notionAccessToken');

  const url = `${NOTION_CONFIG.API_BASE_URL}/v1/pages`;

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  };

  const response = await Util.request(
    url,
    'POST',
    headers,
    JSON.stringify(data),
  );

  const json = await response.json();
  return json;
};
