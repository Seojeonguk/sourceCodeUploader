import * as Github from "../constants/errors.js";
import * as Util from "../../util.js";
import { GITHUB_CONFIG } from "../config/config.js";
import { AUTH_REQUIREMENTS, STORAGE_KEYS } from "../constants/storage.js";

export const authService = {
  openOauthPage() {
    const params = new URLSearchParams({
      client_id: GITHUB_CONFIG.CLIENT_ID,
      redirect_uri: GITHUB_CONFIG.REDIRECT_URL,
      scope: GITHUB_CONFIG.SCOPES[0],
    });

    chrome.tabs.create({
      url: `${GITHUB_CONFIG.BASE_URL}/login/oauth/authorize?${params}`,
    });
  },

  async requestAndSaveAccessToken(payload) {
    if (!payload?.code) {
      throw new Error(Github.ERROR[Github.INVALID_CODE]);
    }

    const { code } = payload;

    const url = `${GITHUB_CONFIG.BASE_URL}/login/oauth/access_token`;

    const data = new FormData();
    data.append('client_id', GITHUB_CONFIG.CLIENT_ID);
    data.append('client_secret', GITHUB_CONFIG.CLIENT_SECRET);
    data.append('code', code);

    const response = await Util.request(url, 'POST', undefined, data);
    if (!response.ok) {
      throw new Error(Github.ERROR[Github.FETCH_API_FAILED]);
    }

    const text = await response.text();
    const matchResult = text.match(/access_token=([^&]*)/);

    if (!matchResult || matchResult.length < 2) {
      throw new Error(Github.ERROR[Github.NOT_FOUND_ACCESS_TOKEN]);
    }

    const accessToken = matchResult[1];

    Util.setChromeStorage(STORAGE_KEYS.ACCESS_TOKEN, accessToken);

    Util.closeLatestTab();

    if (!accessToken) {
      throw new Error(Github.ERROR[Github.INVALID_ACCESS_TOKEN]);
    }

    const userRrl = `${GITHUB_CONFIG.API_BASE_URL}/user`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    const userResponse = await Util.request(userRrl, 'GET', headers, undefined);
    if (!userResponse.ok) {
      throw new Error(Github.ERROR[Github.FETCH_API_FAILED]);
    }

    const json = await userResponse.json();
    const githubID = json.login;
    if (!githubID) {
      throw new Error(Github.ERROR[Github.NOT_FOUND_GITHUB_ID]);
    }

    Util.setChromeStorage(STORAGE_KEYS.GITHUB_ID, githubID);
  },

  async checkAuthRequirements(requirements = AUTH_REQUIREMENTS.ALL) {
    const result = {};

    for (const key of requirements) {
      const value = await Util.getChromeStorage(STORAGE_KEYS[key]);
      if (!value) {
        const errorMap = {
          [STORAGE_KEYS.ACCESS_TOKEN]: Github.INVALID_ACCESS_TOKEN,
          [STORAGE_KEYS.GITHUB_ID]: Github.INVALID_GITHUB_ID,
          [STORAGE_KEYS.UPLOADED_REPOSITORY]:
            Github.INVALID_UPLOADED_REPOSITORY,
        };
        throw new Error(Github.ERROR[errorMap[STORAGE_KEYS[key]]]);
      }
      result[STORAGE_KEYS[key]] = value;
    }

    return result;
  },
};
