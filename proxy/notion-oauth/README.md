# Notion OAuth proxy

Notion needs the client secret to exchange an authorization code for an access token, and anything shipped in an extension can be read by anyone who installs it. This Cloudflare Worker keeps the secret instead, and does only two things:

| Request                             | Calls Notion                                                          |
| ----------------------------------- | --------------------------------------------------------------------- |
| `POST /token` `{ "code": "..." }`   | `POST /v1/oauth/token` with the redirect URI from the worker settings |
| `POST /revoke` `{ "token": "..." }` | `POST /v1/oauth/revoke`                                               |

It accepts requests only from `chrome-extension://<ALLOWED_EXTENSION_ID>` and stores nothing.

GitHub does not need a proxy: the extension logs in with the [device flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow), which needs only the client ID.

## Deploy

1. Find the extension ID on `chrome://extensions/` (the card of Source Code Uploader, with **Developer mode** on).
   An unpacked extension keeps its ID as long as it is loaded from the same folder.
2. Set it as `ALLOWED_EXTENSION_ID` in `wrangler.toml`. `NOTION_REDIRECT_URI` must match the redirect URI of the Notion integration (`https://github.com`).
3. Log in to Cloudflare and set the Notion credentials as secrets (from <https://www.notion.so/my-integrations> → the integration → **Secrets**):

   ```bash
   cd proxy/notion-oauth
   npx wrangler login
   npx wrangler secret put NOTION_CLIENT_ID
   npx wrangler secret put NOTION_CLIENT_SECRET
   ```

4. Deploy:

   ```bash
   npx wrangler deploy
   ```

5. Put the deployed URL (e.g. `https://scu-notion-oauth.<your-subdomain>.workers.dev`) in `TOKEN_PROXY_URL` of `scripts/notion/config/config.js`, and reload the extension.

## Rotating the secret

Generate a new secret in the Notion integration settings, then run `npx wrangler secret put NOTION_CLIENT_SECRET` again. The extension does not change.
