import * as Util from '../../util.js';
import { request } from '../../utils/fetchUtils.js';
import { GITHUB_CONFIG } from '../config/config.js';
import { AUTH_REQUIREMENTS } from '../constants/storage.js';
import { checkAuthRequirements } from './authService.js';

export const getAuthenticatedUserRepositories = async () => {
  const { githubAccessToken } = await checkAuthRequirements(
    AUTH_REQUIREMENTS.ACCESS_TOKEN_ONLY,
  );

  const url = `${GITHUB_CONFIG.API_BASE_URL}/user/repos?type=owner`;
  const headers = {
    accept: 'application/vnd.github+json',
    Authorization: `Bearer ${githubAccessToken}`,
  };

  const response = await request(url, 'GET', headers, undefined);
  return response;
};

export const commit = async (payload) => {
  const { githubAccessToken, githubID, githubUploadedRepository } =
    await checkAuthRequirements(AUTH_REQUIREMENTS.ALL);

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

  const response = await request(url, 'PUT', headers, body);
  const message = response.commit.html_url ?? response.message;

  return message;
};
