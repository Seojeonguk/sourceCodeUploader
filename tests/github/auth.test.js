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

  it('removes the saved values without the client secret', async () => {
    const storage = mockChromeStorage(settings);
    globalThis.fetch = mock.fn(async () => {
      throw new Error('fetch should not be called');
    });

    const result = await dispatch('logout');

    assert.deepEqual(storage, {});
    assert.equal(globalThis.fetch.mock.callCount(), 0);
    // The user can revoke the access on this page.
    assert.deepEqual(result, {
      authorizedAppsUrl: 'https://github.com/settings/applications',
    });
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
      jsonResponse({ message: 'Resource not accessible by integration' }, 403),
    );

    await assert.rejects(dispatch('getRepositories'), { status: 403 });
    assert.deepEqual(storage, settings);
  });
});
