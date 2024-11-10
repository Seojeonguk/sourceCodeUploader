import * as Github from "../constants/errors.js";
import * as Util from "../../util.js";
import { GITHUB_CONFIG } from "../config/config.js";
import { AUTH_REQUIREMENTS } from "../constants/storage.js";
import { authService } from "./authService.js";

export const repoService = {
  async getAuthenticatedUserRepositories() {
    const { githubAccessToken } = await authService.checkAuthRequirements(
      AUTH_REQUIREMENTS.ACCESS_TOKEN_ONLY,
    );

    const url = `${GITHUB_CONFIG.API_BASE_URL}/user/repos?type=owner`;
    const headers = {
      accept: 'application/vnd.github+json',
      Authorization: `Bearer ${githubAccessToken}`,
    };

    const response = await Util.request(url, 'GET', headers, undefined);
    if (!response.ok) {
      throw new Error(Github.ERROR[Github.FETCH_API_FAILED]);
    }

    return await response.json();
  },

  async commit(payload) {
    const { githubAccessToken, githubID, githubUploadedRepository } =
      await authService.checkAuthRequirements(AUTH_REQUIREMENTS.ALL);

    const { extension, problemId, sha, sourceCode, type, title } = payload;
    const path = `${type}/${problemId}.${extension}`;
    const url = `${GITHUB_CONFIG.API_BASE_URL}/repos/${githubID}/${githubUploadedRepository}/contents/${path}`;
    const headers = {
      accept: 'application/vnd.github+json',
      Authorization: `Bearer ${githubAccessToken}`,
    };

    const body = JSON.stringify({
      content: Util.encodeBase64Unicode(sourceCode),
      message: title,
      sha,
    });

    const response = await Util.request(url, 'PUT', headers, body);
    const text = await response.json();
    const message = text.commit.html_url ?? text.message;

    return message;
  },
};
