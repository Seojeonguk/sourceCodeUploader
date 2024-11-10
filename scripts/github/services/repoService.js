import * as Util from "../../util.js";
import { GITHUB_CONFIG } from "../config/config.js";

export const repoService = {
  async getAuthenticatedUserRepositories() {
    const accessToken = await Util.getChromeStorage('githubAccessToken');
    if (Util.isEmpty(accessToken)) {
      throw new Error(Github.ERROR[Github.INVALID_ACCESS_TOKEN]);
    }

    const url = `${GITHUB_CONFIG.API_BASE_URL}/user/repos?type=owner`;
    const headers = {
      accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
    };

    const response = await Util.request(url, 'GET', headers, undefined);
    if (!response.ok) {
      throw new Error(Github.ERROR[Github.FETCH_API_FAILED]);
    }

    return await response.json();
  },
};
