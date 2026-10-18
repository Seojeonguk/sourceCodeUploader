# Notion OAuth proxy

Notion needs the client secret to exchange an authorization code for an access token, and anything shipped in an extension can be read by anyone who installs it. This Cloudflare Worker keeps the secret instead, and does only two things:

| Request                             | Calls Notion                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `POST /token` `{ "code": "..." }`   | `POST /v1/oauth/token` with the redirect URI of the extension that called it |
| `POST /revoke` `{ "token": "..." }` | `POST /v1/oauth/revoke`                                                      |

It accepts requests only from `chrome-extension://<id>` for the IDs in `ALLOWED_EXTENSION_IDS`, and stores nothing. Another extension gets a `403` that it can read, naming its ID, so a missing ID shows up as that message in the extension instead of a CORS error. Other origins get a `403` without CORS headers.

The maintainer deploys it once, and every user logs in through it: the `key` in `manifest.json` gives every unpacked copy the same extension ID, `mfhbpmbchemfhijjamldbkidlegfmaff`.

GitHub does not need a proxy: the extension logs in to its GitHub App with the [device flow](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app#using-the-device-flow-to-generate-a-user-access-token), which needs only the client ID.

## Deploy

1. Check `ALLOWED_EXTENSION_IDS` in `wrangler.toml`. It already has the ID fixed by `manifest.json`; add others separated by commas, such as the Chrome Web Store ID.
2. Register the redirect URI of **each** ID in `ALLOWED_EXTENSION_IDS` in the Notion integration (<https://www.notion.so/my-integrations> → the integration → **OAuth** → Redirect URIs): `https://<extension-id>.chromiumapp.org/`, with the trailing slash. For the fixed ID it is `https://mfhbpmbchemfhijjamldbkidlegfmaff.chromiumapp.org/`. The extension sends this URI (`chrome.identity.getRedirectURL()`) when it opens the login page, and the worker exchanges the code with the URI of the extension that called it, never with one from the request.
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

The `key` in `manifest.json` is the public key of a key pair; it only fixes the extension ID. Keep the private key out of the repository (`*.pem` is ignored). The Chrome Web Store rejects the `key` and gives the extension its own ID, so upload the zip from `npm run package`, which leaves it out ([docs/chrome-web-store.md](../../docs/chrome-web-store.md)). Add that ID to `ALLOWED_EXTENSION_IDS`, register `https://<store-id>.chromiumapp.org/` as a redirect URI in the Notion integration, and deploy the worker again.

## Rotating the secret

Generate a new secret in the Notion integration settings, then run `npx wrangler secret put NOTION_CLIENT_SECRET` again. The extension does not change.
