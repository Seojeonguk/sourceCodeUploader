import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { GITHUB_CONFIG } from '../../scripts/github/config/config.js';
import { getAccessToken } from '../../scripts/github/services/tokenService.js';
import { jsonResponse, mockChromeStorage } from '../helpers/chrome.js';

const HOUR = 60 * 60 * 1000;

const login = (expiresAt) => ({
  githubAccessToken: 'ghu_old',
  githubRefreshToken: 'ghr_old',
  githubTokenExpiresAt: expiresAt,
  githubLoginType: 'app',
  githubID: 'user',
  githubUploadedRepository: 'solutions',
});

const REFRESHED = {
  access_token: 'ghu_new',
  expires_in: 28800,
  refresh_token: 'ghr_new',
  refresh_token_expires_in: 15897600,
  token_type: 'bearer',
  scope: '',
};

describe('getAccessToken', () => {
  beforeEach(() => {
    mock.method(console, 'debug', () => {});
  });

  afterEach(() => {
    mock.restoreAll();
    delete globalThis.chrome;
  });

  it('returns the saved token while it is valid', async () => {
    mockChromeStorage(login(Date.now() + HOUR));
    globalThis.fetch = mock.fn();

    assert.equal(await getAccessToken(), 'ghu_old');
    assert.equal(globalThis.fetch.mock.callCount(), 0);
  });

  [
    ['has expired', -HOUR],
    ['expires in less than 5 minutes', 4 * 60 * 1000],
  ].forEach(([name, fromNow]) => {
    it(`refreshes the token when it ${name}, without the client secret`, async () => {
      const storage = mockChromeStorage(login(Date.now() + fromNow));
      globalThis.fetch = mock.fn(async () => jsonResponse(REFRESHED));

      assert.equal(await getAccessToken(), 'ghu_new');

      const [url, { method, body }] = globalThis.fetch.mock.calls[0].arguments;
      assert.equal(url, 'https://github.com/login/oauth/access_token');
      assert.equal(method, 'POST');
      assert.deepEqual(Object.fromEntries(new URLSearchParams(body)), {
        client_id: GITHUB_CONFIG.CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: 'ghr_old',
      });
      // The refresh token can be used once, so the new one is saved.
      assert.equal(storage.githubAccessToken, 'ghu_new');
      assert.equal(storage.githubRefreshToken, 'ghr_new');
      assert.ok(
        Math.abs(storage.githubTokenExpiresAt - (Date.now() + 8 * HOUR)) < 5000,
      );
    });
  });

  it('refreshes once when two requests find the token expired', async () => {
    mockChromeStorage(login(Date.now() - HOUR));
    globalThis.fetch = mock.fn(async () => jsonResponse(REFRESHED));

    const tokens = await Promise.all([getAccessToken(), getAccessToken()]);

    assert.deepEqual(tokens, ['ghu_new', 'ghu_new']);
    assert.equal(globalThis.fetch.mock.callCount(), 1);
  });

  it('asks to log in again when the refresh token is rejected', async () => {
    const storage = mockChromeStorage(login(Date.now() - HOUR));
    globalThis.fetch = mock.fn(async () =>
      jsonResponse({
        error: 'bad_refresh_token',
        error_description: 'The refresh token passed is incorrect or expired.',
      }),
    );

    await assert.rejects(getAccessToken(), {
      name: 'SetupRequiredException',
      message:
        'Your GitHub login has expired. Log in again in the extension popup.',
    });
    // The selected repository is kept for the next login.
    assert.deepEqual(storage, { githubUploadedRepository: 'solutions' });
  });

  it('does not use a token of the old OAuth App, and asks to log in again', async () => {
    const storage = mockChromeStorage({
      githubAccessToken: 'gho_old',
      githubID: 'user',
      githubUploadedRepository: 'solutions',
    });
    globalThis.fetch = mock.fn();

    await assert.rejects(getAccessToken(), {
      name: 'SetupRequiredException',
      message:
        'The GitHub login now uses only the repositories you choose. Log in again in the extension popup.',
    });
    assert.deepEqual(storage, { githubUploadedRepository: 'solutions' });
    assert.equal(globalThis.fetch.mock.callCount(), 0);
  });

  it('uses a token without an expiry as it is', async () => {
    mockChromeStorage({
      ...login(null),
      githubRefreshToken: null,
    });
    globalThis.fetch = mock.fn();

    assert.equal(await getAccessToken(), 'ghu_old');
    assert.equal(globalThis.fetch.mock.callCount(), 0);
  });

  [
    [
      'a network error',
      async () => {
        throw new TypeError('Failed to fetch');
      },
    ],
    ['a server error', async () => jsonResponse({}, 502)],
  ].forEach(([name, respond]) => {
    it(`keeps the login and asks to try again after ${name}`, async () => {
      const saved = login(Date.now() - HOUR);
      const storage = mockChromeStorage(saved);
      globalThis.fetch = mock.fn(respond);

      await assert.rejects(getAccessToken(), {
        message:
          'Could not refresh the GitHub login. Check the network and try again.',
      });
      assert.deepEqual(storage, saved);
    });
  });

  it('does not bring the login back when the user logs out during the refresh', async () => {
    const storage = mockChromeStorage(login(Date.now() - HOUR));
    globalThis.fetch = mock.fn(async () => {
      // `Remove` in the popup, before GitHub answers.
      [
        'githubAccessToken',
        'githubRefreshToken',
        'githubTokenExpiresAt',
        'githubLoginType',
        'githubID',
        'githubUploadedRepository',
      ].forEach((key) => delete storage[key]);
      return jsonResponse(REFRESHED);
    });

    await assert.rejects(getAccessToken(), {
      name: 'SetupRequiredException',
      message: 'Log in to GitHub in the extension popup first.',
    });
    assert.deepEqual(storage, {});
  });

  it('keeps a new login made during the refresh, and uses its token', async () => {
    const storage = mockChromeStorage(login(Date.now() - HOUR));
    globalThis.fetch = mock.fn(async () => {
      // A new login on the GitHub login page, before GitHub answers.
      Object.assign(storage, {
        githubAccessToken: 'ghu_relogin',
        githubRefreshToken: 'ghr_relogin',
        githubTokenExpiresAt: Date.now() + 8 * HOUR,
      });
      return jsonResponse(REFRESHED);
    });

    assert.equal(await getAccessToken(), 'ghu_relogin');
    assert.equal(storage.githubAccessToken, 'ghu_relogin');
    assert.equal(storage.githubRefreshToken, 'ghr_relogin');
  });

  it('asks to log in without a token', async () => {
    mockChromeStorage({});

    await assert.rejects(getAccessToken(), {
      message: 'Log in to GitHub in the extension popup first.',
    });
  });
});
