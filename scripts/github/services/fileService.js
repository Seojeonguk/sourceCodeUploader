import * as Util from "../../util.js";
import { GITHUB_CONFIG } from "../config/config.js";
import { AUTH_REQUIREMENTS } from "../constants/storage.js";
import { authService } from "./authService.js";

export const fileService = {
  async getShaForExistingFile(payload) {
    const { githubAccessToken, githubID, githubUploadedRepository } =
      await authService.checkAuthRequirements(AUTH_REQUIREMENTS.ALL);

    const { extension, problemId, type } = payload;
    const path = `${type}/${problemId}.${extension}`;
    const url = `${GITHUB_CONFIG.API_BASE_URL}/repos/${githubID}/${githubUploadedRepository}/contents/${path}`;
    const headers = {
      accept: 'application/vnd.github+json',
      Authorization: `Bearer ${githubAccessToken}`,
    };

    const response = await Util.request(url, 'GET', headers, undefined);
    const text = await response.json();

    const { sha, content } = text;
    const sanitizedContent = content?.replaceAll(/\n/g, '');

    return {
      sha,
      content: sanitizedContent,
    };
  },
};
