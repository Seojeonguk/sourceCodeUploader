export const NOTION_CONFIG = Object.freeze({
  API_BASE_URL: 'https://api.notion.com',
  API_VERSION: '2022-06-28',
  BASE_URL: 'https://notion.so',
  CLIENT_ID: 'b5800b4c-70d0-4838-ab55-c7067b51354e',
  REDIRECT_URL: 'https://github.com',
  // The URL of the deployed proxy/notion-oauth worker, which keeps the client secret,
  // such as `https://scu-notion-oauth.<your-subdomain>.workers.dev`.
  TOKEN_PROXY_URL: 'https://scu-notion-oauth.scu-notion-oauth.workers.dev',
});
