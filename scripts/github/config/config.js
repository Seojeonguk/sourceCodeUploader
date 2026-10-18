export const GITHUB_CONFIG = Object.freeze({
  API_BASE_URL: 'https://api.github.com',
  BASE_URL: 'https://github.com',
  // The client ID of the Source Code Uploader GitHub App (Device Flow enabled).
  // Its token can only reach the repositories the user installed the App on,
  // with the App's Contents (read and write) permission.
  CLIENT_ID: 'Iv23ctAQwmFPO2fLbZqs',
  // The page where the user installs the App on repositories.
  INSTALL_URL: 'https://github.com/apps/source-code-uploader/installations/new',
  // GitHub has no API to revoke a token without the client secret.
  AUTHORIZED_APPS_URL: 'https://github.com/settings/apps/authorizations',
});
