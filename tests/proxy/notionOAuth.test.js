import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import worker from '../../proxy/notion-oauth/src/index.js';

const EXTENSION_ID = 'abcdefghijklmnopabcdefghijklmnop';
const OTHER_EXTENSION_ID = 'ponmlkjihgfedcbaponmlkjihgfedcba';
const ORIGIN = `chrome-extension://${EXTENSION_ID}`;

const env = {
  ALLOWED_EXTENSION_IDS: `${EXTENSION_ID}, ${OTHER_EXTENSION_ID}`,
  NOTION_CLIENT_ID: 'client-id',
  NOTION_CLIENT_SECRET: 'client-secret',
  NOTION_REDIRECT_URI:
    'https://mfhbpmbchemfhijjamldbkidlegfmaff.chromiumapp.org/',
};

const call = (path, { method = 'POST', origin = ORIGIN, body } = {}) =>
  worker.fetch(
    new Request(`https://proxy.example.workers.dev${path}`, {
      method,
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );

describe('Notion OAuth proxy', () => {
  beforeEach(() => {
    globalThis.fetch = mock.fn(
      async () =>
        new Response(JSON.stringify({ access_token: 'notion-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('exchanges the code with the client secret and the configured redirect URI', async () => {
    const response = await call('/token', {
      body: { code: 'code', redirect_uri: 'https://attacker.example' },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { access_token: 'notion-token' });
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), ORIGIN);

    const [url, { headers, body }] = globalThis.fetch.mock.calls[0].arguments;
    assert.equal(url, 'https://api.notion.com/v1/oauth/token');
    assert.equal(
      headers.Authorization,
      `Basic ${btoa('client-id:client-secret')}`,
    );
    assert.deepEqual(JSON.parse(body), {
      grant_type: 'authorization_code',
      code: 'code',
      redirect_uri: 'https://mfhbpmbchemfhijjamldbkidlegfmaff.chromiumapp.org/',
    });
  });

  it('revokes a token', async () => {
    await call('/revoke', { body: { token: 'notion-token' } });

    const [url, { body }] = globalThis.fetch.mock.calls[0].arguments;
    assert.equal(url, 'https://api.notion.com/v1/oauth/revoke');
    assert.deepEqual(JSON.parse(body), { token: 'notion-token' });
  });

  it('passes the Notion error through', async () => {
    globalThis.fetch = mock.fn(
      async () =>
        new Response(JSON.stringify({ error: 'invalid_grant' }), {
          status: 400,
        }),
    );

    const response = await call('/token', { body: { code: 'used-code' } });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'invalid_grant' });
  });

  it('rejects other origins without calling Notion', async () => {
    const response = await call('/token', {
      origin: 'https://attacker.example',
      body: { code: 'code' },
    });

    assert.equal(response.status, 403);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
    assert.equal(globalThis.fetch.mock.callCount(), 0);
  });

  describe('an extension that is not allowed', () => {
    const NOT_ALLOWED_ID = 'zyxwvutsrqponmlkzyxwvutsrqponmlk';
    const origin = `chrome-extension://${NOT_ALLOWED_ID}`;

    it('tells why it was refused, with the CORS headers', async () => {
      const response = await call('/token', { origin, body: { code: 'code' } });

      assert.equal(response.status, 403);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
      const body = await response.json();
      assert.equal(body.error, 'forbidden_origin');
      assert.match(body.error_description, new RegExp(NOT_ALLOWED_ID));
      assert.match(body.error_description, /ALLOWED_EXTENSION_IDS/);
      assert.equal(globalThis.fetch.mock.callCount(), 0);
    });

    it('passes the preflight, so the 403 can be read', async () => {
      const response = await call('/token', { method: 'OPTIONS', origin });

      assert.equal(response.status, 204);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
      assert.equal(globalThis.fetch.mock.callCount(), 0);
    });

    it('does not reflect an extension origin without an ID', async () => {
      const response = await call('/token', {
        origin: 'chrome-extension://',
        body: { code: 'code' },
      });

      assert.equal(response.status, 403);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
    });
  });

  it('rejects the preflight of other origins', async () => {
    const response = await call('/token', {
      method: 'OPTIONS',
      origin: 'https://attacker.example',
    });

    assert.equal(response.status, 403);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  });

  it('accepts every allowed extension', async () => {
    const origin = `chrome-extension://${OTHER_EXTENSION_ID}`;
    const response = await call('/token', { origin, body: { code: 'code' } });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  });

  it('rejects every origin when no extension is allowed', async () => {
    const response = await worker.fetch(
      new Request('https://proxy.example.workers.dev/token', {
        method: 'POST',
        headers: { Origin: 'chrome-extension://' },
        body: JSON.stringify({ code: 'code' }),
      }),
      { ...env, ALLOWED_EXTENSION_IDS: '' },
    );

    assert.equal(response.status, 403);
    assert.equal(globalThis.fetch.mock.callCount(), 0);
  });

  it('answers the CORS preflight', async () => {
    const response = await call('/token', { method: 'OPTIONS' });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), ORIGIN);
    assert.equal(globalThis.fetch.mock.callCount(), 0);
  });

  [
    ['an unknown path', '/v1/search', { query: '' }],
    ['a token request without a code', '/token', {}],
    ['a revoke request without a token', '/revoke', { token: '' }],
  ].forEach(([name, path, body]) => {
    it(`rejects ${name} without calling Notion`, async () => {
      const response = await call(path, { body });

      assert.equal(response.status, 400);
      assert.equal(globalThis.fetch.mock.callCount(), 0);
    });
  });

  it('rejects a broken JSON body', async () => {
    const response = await worker.fetch(
      new Request('https://proxy.example.workers.dev/token', {
        method: 'POST',
        headers: { Origin: ORIGIN },
        body: '{',
      }),
      env,
    );

    assert.equal(response.status, 400);
  });

  it('rejects other methods', async () => {
    const response = await call('/token', { method: 'GET' });

    assert.equal(response.status, 405);
  });
});
