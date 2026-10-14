export const NOTION_CONFIG = Object.freeze({
  API_BASE_URL: 'https://api.notion.com',
  // Since 2025-09-03, a database has data sources, which hold its rows.
  // The token proxy keeps its own version, since the OAuth endpoints did not change.
  API_VERSION: '2026-03-11',
  BASE_URL: 'https://notion.so',
  CLIENT_ID: 'b5800b4c-70d0-4838-ab55-c7067b51354e',
  // The URL of the deployed proxy/notion-oauth worker, which keeps the client secret,
  // such as `https://scu-notion-oauth.<your-subdomain>.workers.dev`.
  TOKEN_PROXY_URL: 'https://scu-notion-oauth.scu-notion-oauth.workers.dev',
});
