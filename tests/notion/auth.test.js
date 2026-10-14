import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { dispatch } from '../../scripts/notion/index.js';
import {
  authorize,
  login,
  logout,
} from '../../scripts/notion/services/authService.js';
import {
  jsonResponse,
  mockChromeSessionAndTabs,
  mockChromeStorage,
} from '../helpers/chrome.js';

const PROXY_URL = 'https://scu-notion-oauth.example.workers.dev';

const settings = {
  notionAccessToken: 'token',
  notionUploadedDatabase: 'Problems',
  notionUploadedDatabases: [],
  notionUploadedDatabaseId: 'database-id',
  notionUploadedDataSourceId: 'data-source-id',
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

  it('fails the login when the token cannot be saved', async () => {
    mockChromeStorage();
    globalThis.chrome.storage.local.set = async () => {
      throw new Error('QUOTA_BYTES quota exceeded');
    };
    globalThis.fetch = mock.fn(async () =>
      jsonResponse({ access_token: 'notion-token' }),
    );

    await assert.rejects(login('code', PROXY_URL), {
      message: 'QUOTA_BYTES quota exceeded',
    });
  });
});

describe('Notion authorize', () => {
  const REDIRECT_URI = 'https://extension-id.chromiumapp.org/';

  let storage;

  /**
   * Mocks `chrome.identity`. The login window redirects with the given parameters.
   * @param {(state: string) => Object} createParams - The redirect parameters for the sent state.
   * @returns {Object} The mocked launchWebAuthFlow.
   */
  const mockLoginWindow = (createParams) => {
    const launchWebAuthFlow = mock.fn(async ({ url }) => {
      const state = new URL(url).searchParams.get('state');
      return `${REDIRECT_URI}?${new URLSearchParams(createParams(state))}`;
    });
    globalThis.chrome.identity = {
      getRedirectURL: () => REDIRECT_URI,
      launchWebAuthFlow,
    };
    return launchWebAuthFlow;
  };

  beforeEach(() => {
    mock.method(console, 'debug', () => {});
    mock.method(console, 'warn', () => {});
    storage = mockChromeStorage();
    mockChromeSessionAndTabs();
    globalThis.fetch = mock.fn(async () =>
      jsonResponse({ access_token: 'notion-token' }),
    );
  });

  afterEach(() => {
    mock.restoreAll();
    delete globalThis.chrome;
  });

  it('opens the Notion page with the redirect URI of the extension and a random state', async () => {
    const launchWebAuthFlow = mockLoginWindow((state) => ({
      code: 'code',
      state,
    }));

    await authorize(PROXY_URL);
    await authorize(PROXY_URL);

    const [first, second] = launchWebAuthFlow.mock.calls.map(
      ({ arguments: [details] }) => details,
    );
    const params = new URL(first.url).searchParams;
    assert.equal(first.interactive, true);
    assert.equal(params.get('redirect_uri'), REDIRECT_URI);
    assert.equal(params.get('response_type'), 'code');
    assert.match(params.get('state'), /^[0-9a-f-]{36}$/);
    assert.notEqual(
      params.get('state'),
      new URL(second.url).searchParams.get('state'),
    );
  });

  it('exchanges the code and saves the token', async () => {
    mockLoginWindow((state) => ({ code: 'code', state }));

    await authorize(PROXY_URL);

    const [url, { body }] = globalThis.fetch.mock.calls[0].arguments;
    assert.equal(url, `${PROXY_URL}/token`);
    assert.deepEqual(JSON.parse(body), { code: 'code' });
    assert.equal(storage.notionAccessToken, 'notion-token');
  });

  it('rejects a redirect with another state', async () => {
    mockLoginWindow(() => ({ code: 'code', state: 'other' }));

    await assert.rejects(authorize(PROXY_URL), {
      name: 'OAuthException',
      reason: 'state',
    });
    assert.equal(globalThis.fetch.mock.callCount(), 0);
  });

  it('reports a canceled login without exchanging a code', async () => {
    mockLoginWindow((state) => ({ error: 'access_denied', state }));

    await assert.rejects(authorize(PROXY_URL), {
      name: 'OAuthException',
      message: 'Access to Notion was not allowed.',
    });
    assert.equal(globalThis.fetch.mock.callCount(), 0);
  });

  it('reports a closed login window', async () => {
    globalThis.chrome.identity = {
      getRedirectURL: () => REDIRECT_URI,
      launchWebAuthFlow: async () => {
        throw new Error('The user did not approve access.');
      },
    };

    await assert.rejects(authorize(PROXY_URL), {
      name: 'OAuthException',
      message: 'The Notion login window was closed before the login finished.',
    });
  });

  it('reports a failed token exchange', async () => {
    mockLoginWindow((state) => ({ code: 'code', state }));
    globalThis.fetch = mock.fn(async () =>
      jsonResponse(
        {
          error: 'invalid_grant',
          error_description: 'The redirect_uri does not match.',
        },
        400,
      ),
    );

    await assert.rejects(authorize(PROXY_URL), {
      message: 'The redirect_uri does not match. (HTTP 400)',
    });
    assert.equal(storage.notionAccessToken, undefined);
  });

  it('asks to set the proxy before opening the Notion page', async () => {
    const launchWebAuthFlow = mockLoginWindow((state) => ({
      code: 'code',
      state,
    }));

    await assert.rejects(authorize(''), {
      name: 'SetupRequiredException',
      message:
        'Set the URL of the Notion token proxy (TOKEN_PROXY_URL) in the extension config first.',
    });
    assert.equal(launchWebAuthFlow.mock.callCount(), 0);
  });

  describe('the error for the popup', () => {
    it('keeps why the login failed until the popup takes it', async () => {
      mockLoginWindow((state) => ({ error: 'access_denied', state }));

      await assert.rejects(dispatch('openOauthPage'));

      assert.equal(
        await dispatch('takeLoginError'),
        'Access to Notion was not allowed.',
      );
      assert.equal(await dispatch('takeLoginError'), null);
    });

    it('clears the error of the last login when a login succeeds', async () => {
      mockLoginWindow((state) => ({ error: 'access_denied', state }));
      await assert.rejects(dispatch('openOauthPage'));

      mockLoginWindow((state) => ({ code: 'code', state }));
      await dispatch('openOauthPage');

      assert.equal(await dispatch('takeLoginError'), null);
      assert.equal(storage.notionAccessToken, 'notion-token');
    });
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
