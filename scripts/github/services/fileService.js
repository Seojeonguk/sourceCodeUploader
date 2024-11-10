import * as Github from "../constants/errors.js";
import * as Util from "../../util.js";
import { GITHUB_CONFIG } from "../config/config.js";

export const fileService = {
  async getShaForExistingFile(payload) {
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

    const { extension, problemId, type } = payload;
    const path = `${type}/${problemId}.${extension}`;
    const url = `${GITHUB_CONFIG.API_BASE_URL}/repos/${githubID}/${uploadedRepository}/contents/${path}`;
    const headers = {
      accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
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
