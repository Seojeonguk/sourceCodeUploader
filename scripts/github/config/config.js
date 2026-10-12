export const GITHUB_CONFIG = Object.freeze({
  API_BASE_URL: 'https://api.github.com',
  BASE_URL: 'https://github.com',
  CLIENT_ID: '2cfd0f1fae095d5a1684',
  SCOPES: ['repo'],
  // GitHub has no API to revoke a token without the client secret.
  AUTHORIZED_APPS_URL: 'https://github.com/settings/applications',
});
