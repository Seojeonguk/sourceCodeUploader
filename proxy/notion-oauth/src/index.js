/**
 * A Cloudflare Worker that keeps the Notion client secret out of the extension.
 *
 * The extension sends the authorization code (or the token to revoke) here, and the worker
 * calls Notion with the client ID and secret, which are set as worker secrets.
 *
 * - POST /token  { code }  → POST https://api.notion.com/v1/oauth/token
 * - POST /revoke { token } → POST https://api.notion.com/v1/oauth/revoke
 *
 * Environment variables:
 * - NOTION_CLIENT_ID, NOTION_CLIENT_SECRET (secrets)
 * - NOTION_REDIRECT_URI: the redirect URI registered in the Notion integration
 * - ALLOWED_EXTENSION_IDS: the comma-separated IDs of the extensions allowed to call this worker
 */

const NOTION_API_BASE_URL = 'https://api.notion.com';
const NOTION_VERSION = '2022-06-28';

const jsonResponse = (body, status, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

const createCorsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  Vary: 'Origin',
});

const readJson = async (request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

const isNonEmptyString = (value) => typeof value === 'string' && value !== '';

/**
 * Returns the origin of the request if it is one of the allowed extensions.
 * @returns {?string} The allowed origin, or null.
 */
const findAllowedOrigin = (request, env) => {
  const origin = request.headers.get('Origin');
  const allowedOrigins = (env.ALLOWED_EXTENSION_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id !== '')
    .map((id) => `chrome-extension://${id}`);
  return allowedOrigins.includes(origin) ? origin : null;
};

const EXTENSION_ORIGIN_PREFIX = 'chrome-extension://';

/**
 * Answers an origin that is not allowed.
 * An extension that is not in ALLOWED_EXTENSION_IDS, such as one loaded from a folder without
 * the fixed `key`, gets the CORS headers, so it can read why it was refused instead of a
 * network error. Other origins get no CORS headers. Nothing is sent to Notion in either case.
 */
const forbidOrigin = (request) => {
  const origin = request.headers.get('Origin') ?? '';
  const extensionId = origin.startsWith(EXTENSION_ORIGIN_PREFIX)
    ? origin.slice(EXTENSION_ORIGIN_PREFIX.length)
    : '';
  if (!extensionId) {
    return jsonResponse({ error: 'forbidden_origin' }, 403);
  }

  const corsHeaders = createCorsHeaders(origin);
  // The preflight has to pass for the extension to read the 403 of the request itself.
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return jsonResponse(
    {
      error: 'forbidden_origin',
      error_description: `The Notion token proxy does not allow this extension (ID: ${extensionId}). Add the ID to ALLOWED_EXTENSION_IDS of the worker and deploy it again.`,
    },
    403,
    corsHeaders,
  );
};

/**
 * Creates the request to Notion for the path. The redirect URI comes from the worker
 * settings, not from the request, so the worker only completes this extension's logins.
 * @returns {?{path: string, body: Object}} The Notion request, or null if the input is invalid.
 */
const createNotionRequest = (pathname, body, env) => {
  if (pathname === '/token' && isNonEmptyString(body?.code)) {
    return {
      path: '/v1/oauth/token',
      body: {
        grant_type: 'authorization_code',
        code: body.code,
        redirect_uri: env.NOTION_REDIRECT_URI,
      },
    };
  }

  if (pathname === '/revoke' && isNonEmptyString(body?.token)) {
    return { path: '/v1/oauth/revoke', body: { token: body.token } };
  }

  return null;
};

export default {
  async fetch(request, env) {
    // Only the extension can call the worker from a browser. Other clients can send any
    // Origin header, but an authorization code is useless without the user's consent.
    const allowedOrigin = findAllowedOrigin(request, env);
    if (!allowedOrigin) {
      return forbidOrigin(request);
    }

    const corsHeaders = createCorsHeaders(allowedOrigin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'method_not_allowed' }, 405, corsHeaders);
    }

    const { pathname } = new URL(request.url);
    const notionRequest = createNotionRequest(
      pathname,
      await readJson(request),
      env,
    );
    if (!notionRequest) {
      return jsonResponse({ error: 'invalid_request' }, 400, corsHeaders);
    }

    const credentials = btoa(
      `${env.NOTION_CLIENT_ID}:${env.NOTION_CLIENT_SECRET}`,
    );
    const response = await fetch(
      `${NOTION_API_BASE_URL}${notionRequest.path}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
          'Notion-Version': NOTION_VERSION,
        },
        body: JSON.stringify(notionRequest.body),
      },
    );

    // Pass the Notion response (the token or the error) through as it is.
    return new Response(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  },
};
