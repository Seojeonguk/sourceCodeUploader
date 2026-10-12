import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { dispatch } from '../../scripts/notion/index.js';
import {
  login,
  logout,
  openOauthPage,
} from '../../scripts/notion/services/authService.js';
import { jsonResponse, mockChromeStorage } from '../helpers/chrome.js';

const PROXY_URL = 'https://scu-notion-oauth.example.workers.dev';

const settings = {
  notionAccessToken: 'token',
  notionUploadedDatabase: 'Problems',
  notionUploadedDatabases: [],
  notionUploadedDatabaseId: 'database-id',
};

describe('Notion logout', () => {
  beforeEach(() => {
    mock.method(console, 'debug', () => {});
    mock.method(console, 'warn', () => {});
  });

  afterEach(() => {
    mock.restoreAll();
    delete globalThis.chrome;
  });

  it('revokes the access token through the proxy and removes the saved values', async () => {
    const storage = mockChromeStorage(settings);
    globalThis.fetch = mock.fn(async () => jsonResponse({ request_id: 'id' }));

    await logout(PROXY_URL);

    const [url, { method, headers, body }] =
      globalThis.fetch.mock.calls[0].arguments;
    assert.equal(url, `${PROXY_URL}/revoke`);
    assert.equal(method, 'POST');
    // The extension does not send the client secret.
    assert.equal(headers.Authorization, undefined);
    assert.deepEqual(JSON.parse(body), { token: 'token' });
    assert.deepEqual(storage, {});
  });

  it('removes the saved values even if revoking fails', async () => {
    const storage = mockChromeStorage(settings);
    globalThis.fetch = mock.fn(async () =>
      jsonResponse({ message: 'invalid_grant' }, 400),
    );

    await logout(PROXY_URL);

    assert.deepEqual(storage, {});
  });

  it('removes the saved values when the proxy is not set', async () => {
    const storage = mockChromeStorage(settings);
    globalThis.fetch = mock.fn();

    await logout('');

    assert.deepEqual(storage, {});
    assert.equal(globalThis.fetch.mock.callCount(), 0);
  });
});

describe('Notion login', () => {
  beforeEach(() => {
    mock.method(console, 'debug', () => {});
  });

  afterEach(() => {
    mock.restoreAll();
    delete globalThis.chrome;
  });

  it('exchanges the code through the proxy', async () => {
    const storage = mockChromeStorage();
    globalThis.fetch = mock.fn(async () =>
      jsonResponse({ access_token: 'notion-token' }),
    );

    await login('code', `${PROXY_URL}/`);

    const [url, { headers, body }] = globalThis.fetch.mock.calls[0].arguments;
    assert.equal(url, `${PROXY_URL}/token`);
    assert.equal(headers.Authorization, undefined);
    assert.deepEqual(JSON.parse(body), { code: 'code' });
    assert.equal(storage.notionAccessToken, 'notion-token');
  });

  it('asks to set the proxy before opening the Notion page', async () => {
    mockChromeStorage();
    globalThis.chrome.tabs = { create: mock.fn() };

    await assert.rejects(openOauthPage(''), {
      name: 'SetupRequiredException',
      message:
        'Set the URL of the Notion token proxy (TOKEN_PROXY_URL) in the extension config first.',
    });
    assert.equal(globalThis.chrome.tabs.create.mock.callCount(), 0);
  });
});

describe('Notion expired login', () => {
  afterEach(() => {
    mock.restoreAll();
    delete globalThis.chrome;
  });

  it('removes the login and asks to log in again on 401', async () => {
    mock.method(console, 'debug', () => {});
    const storage = mockChromeStorage(settings);
    globalThis.fetch = mock.fn(async () =>
      jsonResponse({ code: 'unauthorized' }, 401),
    );

    await assert.rejects(dispatch('getDatabases'), {
      name: 'SetupRequiredException',
      message:
        'Your Notion login has expired. Log in again in the extension popup.',
    });
    // The selected database is kept for the next login.
    const { notionAccessToken, ...rest } = settings;
    assert.equal(notionAccessToken, 'token');
    assert.deepEqual(storage, rest);
  });
});
