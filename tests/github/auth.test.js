import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { dispatch } from '../../scripts/github/index.js';
import { jsonResponse, mockChromeStorage } from '../helpers/chrome.js';

const settings = {
  githubAccessToken: 'token',
  githubID: 'user',
  githubUploadedRepository: 'solutions',
};

describe('GitHub logout', () => {
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
    globalThis.fetch = mock.fn(async () => new Response(null, { status: 204 }));

    await dispatch('logout');

    const [url, { method, headers, body }] =
      globalThis.fetch.mock.calls[0].arguments;
    assert.match(url, /\/applications\/[^/]+\/token$/);
    assert.equal(method, 'DELETE');
    assert.match(headers.Authorization, /^Basic /);
    assert.deepEqual(JSON.parse(body), { access_token: 'token' });
    assert.deepEqual(storage, {});
  });

  it('removes the saved values even if revoking fails', async () => {
    const storage = mockChromeStorage(settings);
    globalThis.fetch = mock.fn(async () =>
      jsonResponse({ message: 'Not Found' }, 404),
    );

    await dispatch('logout');

    assert.deepEqual(storage, {});
  });
});

describe('GitHub expired login', () => {
  beforeEach(() => {
    mock.method(console, 'debug', () => {});
  });

  afterEach(() => {
    mock.restoreAll();
    delete globalThis.chrome;
  });

  it('removes the login and asks to log in again on 401', async () => {
    const storage = mockChromeStorage(settings);
    globalThis.fetch = mock.fn(async () =>
      jsonResponse({ message: 'Bad credentials' }, 401),
    );

    await assert.rejects(dispatch('getRepositories'), {
      name: 'SetupRequiredException',
      message:
        'Your GitHub login has expired. Log in again in the extension popup.',
    });
    // The selected repository is kept for the next login.
    assert.deepEqual(storage, { githubUploadedRepository: 'solutions' });
  });

  it('keeps the login on other errors', async () => {
    const storage = mockChromeStorage(settings);
    globalThis.fetch = mock.fn(async () =>
      jsonResponse({ message: 'Server Error' }, 500),
    );

    await assert.rejects(dispatch('getRepositories'), { status: 500 });
    assert.deepEqual(storage, settings);
  });
});
