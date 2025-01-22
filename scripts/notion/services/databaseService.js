import * as Notion from "../constants/errors.js";
import { request } from "../../utils/fetchUtils.js";
import { getChromeStorage } from "../../utils/storaageUtils.js";
import { NOTION_CONFIG } from "../config/config.js";

export const getDatabases = async () => {
  const accessToken = await getChromeStorage('notionAccessToken');
  if (!accessToken) {
    console.debug(NOTION.ERROR[NOTION.INVALID_ACCESS_TOKEN]);
    throw new Error(Notion.ERROR[Notion.INVALID_ACCESS_TOKEN]);
  }

  const url = `${NOTION_CONFIG.API_BASE_URL}/v1/search`;

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

  const response = await request(url, 'POST', headers, body);

  const results = response.results;

  return results;
};
