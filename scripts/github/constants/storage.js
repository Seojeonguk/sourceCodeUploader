export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'githubAccessToken',
  GITHUB_ID: 'githubID',
  UPLOADED_REPOSITORY: 'githubUploadedRepository',
};

export const AUTH_REQUIREMENTS = {
  ACCESS_TOKEN_ONLY: ['ACCESS_TOKEN'],
  ACCESS_TOKEN_AND_ID: ['ACCESS_TOKEN', 'GITHUB_ID'],
  ALL: ['ACCESS_TOKEN', 'GITHUB_ID', 'UPLOADED_REPOSITORY'],
};
