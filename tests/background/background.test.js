import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it, mock } from 'node:test';

const EXTENSION_ID = 'mfhbpmbchemfhijjamldbkidlegfmaff';
const EXTENSION_ORIGIN = `chrome-extension://${EXTENSION_ID}`;
const PROBLEM_URL =
  'https://school.programmers.co.kr/learn/courses/30/lessons/1845';

const judgePage = {
  id: EXTENSION_ID,
  url: PROBLEM_URL,
  tab: { id: 1 },
  frameId: 0,
};
const popup = {
  id: EXTENSION_ID,
  url: `${EXTENSION_ORIGIN}/popup/html/index.html`,
};

const storage = {};
let setAccessLevel;
let handleMessage;

/**
 * Sends a message to the background listener, like chrome.runtime.sendMessage.
 * @returns {Promise<Object>} The response.
 */
const send = (message, sender) =>
  new Promise((resolve) => {
    handleMessage(message, sender, resolve);
  });

describe('background', () => {
  before(async () => {
    setAccessLevel = mock.fn(async () => {});
    globalThis.chrome = {
      runtime: {
        id: EXTENSION_ID,
        getURL: (path) => `${EXTENSION_ORIGIN}/${path}`,
        onMessage: {
          addListener: (listener) => {
            handleMessage = listener;
          },
        },
      },
      storage: {
        local: {
          setAccessLevel,
          get: ([key], callback) => callback({ [key]: storage[key] }),
        },
      },
    };
    // The service worker registers the listener when it is loaded.
    await import('../../scripts/background.js');
  });

  beforeEach(() => {
    mock.method(console, 'debug', () => {});
  });

  after(() => {
    mock.restoreAll();
    delete globalThis.chrome;
  });

  it('hides the storage from content scripts', () => {
    assert.deepEqual(setAccessLevel.mock.calls[0].arguments, [
      { accessLevel: 'TRUSTED_CONTEXTS' },
    ]);
  });

  it('refuses a message that the sender may not send', async () => {
    globalThis.fetch = mock.fn();

    const response = await send(
      { platform: 'github', action: 'getRepositories' },
      judgePage,
    );

    assert.deepEqual(response, {
      ok: false,
      message: 'github/getRepositories cannot be requested from this page.',
    });
    assert.equal(globalThis.fetch.mock.callCount(), 0);
  });

  it('answers the auto upload options to a judge page', async () => {
    storage.githubAutoUpload = true;

    assert.deepEqual(
      await send({ platform: 'github', action: 'getAutoUpload' }, judgePage),
      { ok: true, message: true },
    );
    assert.deepEqual(
      await send({ platform: 'notion', action: 'getAutoUpload' }, judgePage),
      { ok: true, message: false },
    );
  });

  it('answers an extension page', async () => {
    assert.deepEqual(
      await send({ platform: 'notion', action: 'getAutoUpload' }, popup),
      { ok: true, message: false },
    );
  });

  it('refuses an unknown platform', async () => {
    const response = await send(
      { platform: 'oauth', action: 'complete' },
      popup,
    );

    assert.equal(response.ok, false);
  });
});
