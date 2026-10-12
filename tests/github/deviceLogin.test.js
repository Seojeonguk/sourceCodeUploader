import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { dispatch } from '../../scripts/github/index.js';
import {
  jsonResponse,
  mockChromeSessionAndTabs,
  mockChromeStorage,
} from '../helpers/chrome.js';

const DEVICE_CODE_RESPONSE = {
  device_code: 'device-code',
  user_code: 'ABCD-1234',
  verification_uri: 'https://github.com/login/device',
  expires_in: 900,
  interval: 5,
};

/**
 * Mocks the GitHub device flow.
 * @param {Object[]} tokenResponses - The responses of the token endpoint, in order.
 */
const mockGithub = (tokenResponses = []) => {
  const responses = [...tokenResponses];

  globalThis.fetch = mock.fn(async (url) => {
    const { pathname } = new URL(url);
    if (pathname === '/login/device/code') {
      return jsonResponse(DEVICE_CODE_RESPONSE);
    }
    if (pathname === '/login/oauth/access_token') {
      return jsonResponse(responses.shift());
    }
    if (pathname === '/user') {
      return jsonResponse({ login: 'user' });
    }
    return jsonResponse({ message: 'Not Found' }, 404);
  });
};

const bodyOf = (path) => {
  const call = globalThis.fetch.mock.calls.find(
    ({ arguments: [url] }) => new URL(url).pathname === path,
  );
  return Object.fromEntries(new URLSearchParams(call.arguments[1].body));
};

describe('GitHub device login', () => {
  let storage;
  let tabs;

  beforeEach(() => {
    storage = mockChromeStorage();
    tabs = mockChromeSessionAndTabs();
    mock.method(console, 'debug', () => {});
    globalThis.chrome.runtime = {
      getURL: (path) => `chrome-extension://id/${path}`,
    };
  });

  afterEach(() => {
    mock.restoreAll();
    delete globalThis.chrome;
  });

  it('opens the login page of the extension', async () => {
    await dispatch('openOauthPage');

    assert.equal(
      tabs.createdTabs[0].url,
      'chrome-extension://id/popup/html/githubLogin.html',
    );
  });

  it('requests a device code with only the client ID', async () => {
    mockGithub();

    const result = await dispatch('startDeviceLogin');

    assert.deepEqual(result, {
      userCode: 'ABCD-1234',
      verificationUri: 'https://github.com/login/device',
      interval: 5,
      expiresIn: 900,
    });
    assert.deepEqual(Object.keys(bodyOf('/login/device/code')), [
      'client_id',
      'scope',
    ]);
    // The device code stays in the background.
    assert.equal(tabs.session.githubDeviceLogin.deviceCode, 'device-code');
  });

  it('keeps waiting while the code is not entered', async () => {
    mockGithub([{ error: 'authorization_pending' }]);
    await dispatch('startDeviceLogin');

    assert.deepEqual(await dispatch('pollDeviceLogin'), {
      status: 'pending',
      interval: 5,
    });
    assert.equal(storage.githubAccessToken, undefined);
  });

  it('waits longer after slow_down', async () => {
    mockGithub([{ error: 'slow_down' }, { error: 'authorization_pending' }]);
    await dispatch('startDeviceLogin');

    assert.deepEqual(await dispatch('pollDeviceLogin'), {
      status: 'pending',
      interval: 10,
    });
    assert.deepEqual(await dispatch('pollDeviceLogin'), {
      status: 'pending',
      interval: 10,
    });
  });

  it('does not report the login as done when it cannot be saved', async () => {
    mockGithub([{ access_token: 'github-token', token_type: 'bearer' }]);
    await dispatch('startDeviceLogin');
    globalThis.chrome.storage.local.set = async () => {
      throw new Error('QUOTA_BYTES quota exceeded');
    };

    await assert.rejects(dispatch('pollDeviceLogin'), {
      message: 'QUOTA_BYTES quota exceeded',
    });
  });

  it('saves the login when the code is entered', async () => {
    mockGithub([{ access_token: 'github-token', token_type: 'bearer' }]);
    await dispatch('startDeviceLogin');

    assert.deepEqual(await dispatch('pollDeviceLogin'), { status: 'done' });

    assert.equal(storage.githubAccessToken, 'github-token');
    assert.equal(storage.githubID, 'user');
    assert.deepEqual(bodyOf('/login/oauth/access_token'), {
      client_id: '2cfd0f1fae095d5a1684',
      device_code: 'device-code',
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    });
    assert.equal(tabs.session.githubDeviceLogin, undefined);
  });

  it('reports a denied access', async () => {
    mockGithub([{ error: 'access_denied' }]);
    await dispatch('startDeviceLogin');

    assert.deepEqual(await dispatch('pollDeviceLogin'), { status: 'denied' });
    assert.equal(tabs.session.githubDeviceLogin, undefined);
  });

  it('reports an expired code', async () => {
    mockGithub([{ error: 'expired_token' }]);
    await dispatch('startDeviceLogin');

    assert.deepEqual(await dispatch('pollDeviceLogin'), {
      status: 'expired',
    });
  });

  it('does not poll after the code has expired', async () => {
    const now = Date.now();
    mock.method(Date, 'now', () => now);
    mockGithub();
    await dispatch('startDeviceLogin');

    Date.now.mock.mockImplementation(() => now + 900 * 1000);

    assert.deepEqual(await dispatch('pollDeviceLogin'), {
      status: 'expired',
    });
    assert.equal(globalThis.fetch.mock.callCount(), 1);
  });

  it('reports expired without a started login', async () => {
    mockGithub();

    assert.deepEqual(await dispatch('pollDeviceLogin'), {
      status: 'expired',
    });
    assert.equal(globalThis.fetch.mock.callCount(), 0);
  });

  it('throws other errors, such as a disabled device flow', async () => {
    mockGithub([
      {
        error: 'device_flow_disabled',
        error_description: 'Device flow must be explicitly enabled.',
      },
    ]);
    await dispatch('startDeviceLogin');

    await assert.rejects(dispatch('pollDeviceLogin'), {
      message: 'Device flow must be explicitly enabled.',
    });
  });
});
