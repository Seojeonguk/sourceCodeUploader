import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { dispatch } from '../../scripts/notion/index.js';
import { jsonResponse, mockChromeStorage } from '../helpers/chrome.js';

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

  it('revokes the access token and removes the saved values', async () => {
    const storage = mockChromeStorage(settings);
    globalThis.fetch = mock.fn(async () => jsonResponse({ request_id: 'id' }));

    await dispatch('logout');

    const [url, { method, headers, body }] =
      globalThis.fetch.mock.calls[0].arguments;
    assert.match(url, /\/v1\/oauth\/revoke$/);
    assert.equal(method, 'POST');
    assert.match(headers.Authorization, /^Basic /);
    assert.deepEqual(JSON.parse(body), { token: 'token' });
    assert.deepEqual(storage, {});
  });

  it('removes the saved values even if revoking fails', async () => {
    const storage = mockChromeStorage(settings);
    globalThis.fetch = mock.fn(async () =>
      jsonResponse({ message: 'invalid_grant' }, 400),
    );

    await dispatch('logout');

    assert.deepEqual(storage, {});
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
