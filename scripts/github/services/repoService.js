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

  async commit(payload) {
    const accessToken = await Util.getChromeStorage('githubAccessToken');
    if (Util.isEmpty(accessToken)) {
      throw new Error(Github.ERROR[Github.INVALID_ACCESS_TOKEN]);
    }

    const githubID = await Util.getChromeStorage('githubID');
    if (Util.isEmpty(githubID)) {
      throw new Error(Github.ERROR[Github.INVALID_GITHUB_ID]);
    }

    const uploadedRepository = await Util.getChromeStorage(
      'githubUploadedRepository',
    );
    if (Util.isEmpty(uploadedRepository)) {
      throw new Error(Github.ERROR[Github.INVALID_UPLOADED_REPOSITORY]);
    }

    const { extension, problemId, sha, sourceCode, type, title } = payload;
    const path = `${type}/${problemId}.${extension}`;
    const url = `${GITHUB_CONFIG.API_BASE_URL}/repos/${githubID}/${uploadedRepository}/contents/${path}`;
    const headers = {
      accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
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
