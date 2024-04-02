import { API_BASE_URL } from "../constants.js";
import * as Util from "../../util.js";

export const createPage = async (data) => {
  const accessToken = await Util.getChromeStorage("notionAccessToken");

  const url = `${API_BASE_URL}/v1/pages`;

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
  };

  const response = await Util.request(
    url,
    "POST",
    headers,
    JSON.stringify(data)
  );

  const json = await response.json();
  return json;
};
