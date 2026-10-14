# Notion OAuth proxy

Notion needs the client secret to exchange an authorization code for an access token, and anything shipped in an extension can be read by anyone who installs it. This Cloudflare Worker keeps the secret instead, and does only two things:

| Request                             | Calls Notion                                                          |
| ----------------------------------- | --------------------------------------------------------------------- |
| `POST /token` `{ "code": "..." }`   | `POST /v1/oauth/token` with the redirect URI from the worker settings |
| `POST /revoke` `{ "token": "..." }` | `POST /v1/oauth/revoke`                                               |

It accepts requests only from `chrome-extension://<id>` for the IDs in `ALLOWED_EXTENSION_IDS`, and stores nothing. Another extension gets a `403` that it can read, naming its ID, so a missing ID shows up as that message in the extension instead of a CORS error. Other origins get a `403` without CORS headers.

The maintainer deploys it once, and every user logs in through it: the `key` in `manifest.json` gives every unpacked copy the same extension ID, `mfhbpmbchemfhijjamldbkidlegfmaff`.

GitHub does not need a proxy: the extension logs in with the [device flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow), which needs only the client ID.

## Deploy

1. Check `ALLOWED_EXTENSION_IDS` in `wrangler.toml`. It already has the ID fixed by `manifest.json`; add others separated by commas, such as the Chrome Web Store ID.
2. `NOTION_REDIRECT_URI` must match the redirect URI of the Notion integration (`https://github.com`).
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

5. Put the deployed URL (e.g. `https://scu-notion-oauth.<your-subdomain>.workers.dev`) in `TOKEN_PROXY_URL` of `scripts/notion/config/config.js`, and commit it. The URL is not a secret.

On Windows, run `wrangler secret put` in PowerShell or cmd: Git Bash does not show its prompt. In Git Bash, pipe the value instead, e.g. `printf %s "<value>" | npx wrangler secret put NOTION_CLIENT_ID`.

## The extension key

The `key` in `manifest.json` is the public key of a key pair; it only fixes the extension ID. Keep the private key out of the repository (`*.pem` is ignored). Remove the `key` before uploading to the Chrome Web Store, which gives the extension its own ID, and add that ID to `ALLOWED_EXTENSION_IDS`.

## Rotating the secret

Generate a new secret in the Notion integration settings, then run `npx wrangler secret put NOTION_CLIENT_SECRET` again. The extension does not change.
