import * as Github from "../constants/errors.js";
import * as Util from "../../util.js";
import { request } from "../../utils/fetchUtils.js";
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

  async getAccessToken(payload) {
    if (!payload?.code) {
      throw new Error(Github.ERROR[Github.INVALID_CODE]);
    }

    const url = `${GITHUB_CONFIG.BASE_URL}/login/oauth/access_token`;
    const data = new FormData();
    data.append('client_id', GITHUB_CONFIG.CLIENT_ID);
    data.append('client_secret', GITHUB_CONFIG.CLIENT_SECRET);
    data.append('code', payload.code);

    const response = await request(url, 'POST', undefined, data);
    const accessToken = response.match(/access_token=([^&]*)/)?.[1];
    if (!accessToken) {
      throw new Error(Github.ERROR[Github.NOT_FOUND_ACCESS_TOKEN]);
    }

    Util.closeLatestTab();

    return accessToken;
  },

  async getUserInfo(accessToken) {
    const url = `${GITHUB_CONFIG.API_BASE_URL}/user`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    const response = await request(url, 'GET', headers, undefined);
    const githubID = response?.login;
    if (!githubID) {
      throw new Error(Github.ERROR[Github.NOT_FOUND_GITHUB_ID]);
    }

    return githubID;
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

  saveInfo(accessToken, githubID) {
    Util.setChromeStorage(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    Util.setChromeStorage(STORAGE_KEYS.GITHUB_ID, githubID);
  },
};
