import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { sendMessage } from '../../scripts/common/utils/chrome/runtime.js';

/**
 * Mocks `chrome.runtime.sendMessage`, which answers through a callback.
 * @param {*} response - The response of the background.
 * @param {?Object} [lastError] - Set while the callback runs, like Chrome does.
 * @returns {Object[]} The sent messages.
 */
const mockRuntime = (response, lastError = null) => {
  const messages = [];
  globalThis.chrome = {
    runtime: {
      lastError: null,
      sendMessage(message, callback) {
        messages.push(message);
        this.lastError = lastError;
        callback(response);
        this.lastError = null;
      },
    },
  };
  return messages;
};

describe('sendMessage', () => {
  afterEach(() => {
    delete globalThis.chrome;
  });

  it('sends the platform, the action and the payload', async () => {
    const messages = mockRuntime({ ok: true, message: [] });

    const response = await sendMessage('github', 'getRepositories', { a: 1 });

    assert.deepEqual(messages, [
      { platform: 'github', action: 'getRepositories', payload: { a: 1 } },
    ]);
    assert.deepEqual(response, { ok: true, message: [] });
  });

  it('returns a failure with the error when the background cannot be reached', async () => {
    mockRuntime(undefined, {
      message: 'Could not establish connection. Receiving end does not exist.',
    });

    assert.deepEqual(await sendMessage('github', 'getRepositories'), {
      ok: false,
      message: 'Could not establish connection. Receiving end does not exist.',
    });
  });

  it('returns a failure when the background answers nothing', async () => {
    mockRuntime(undefined);

    assert.deepEqual(await sendMessage('notion', 'getDatabases'), {
      ok: false,
      message: 'The extension did not respond. Try again.',
    });
  });

  it('keeps a failure from the background', async () => {
    mockRuntime({ ok: false, message: 'Log in to GitHub first.' });

    assert.deepEqual(await sendMessage('github', 'getRepositories'), {
      ok: false,
      message: 'Log in to GitHub first.',
    });
  });
});
