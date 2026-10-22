import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import {
  initializeSitePermissions,
  syncSiteScripts,
} from '../../scripts/sitePermissions.js';
import { chromeI18n } from '../helpers/i18n.js';

const SCRIPT = Object.freeze({
  id: 'demo-judge',
  matches: ['https://judge.example/*'],
  js: ['scripts/demo/index.js'],
  runAt: 'document_idle',
});

const SITES = Object.freeze([
  { id: 'required', optional: false, origins: ['https://required.example/*'] },
  {
    id: 'demo',
    optional: true,
    origins: ['https://judge.example/*'],
    contentScripts: [SCRIPT],
  },
]);

/**
 * Mocks chrome.permissions and chrome.scripting.
 * @param {Object} param
 * @param {string[]} param.granted - The granted origins.
 * @param {string[]} param.registered - The IDs of the registered scripts.
 */
const mockChrome = ({ granted, registered }) => {
  const listeners = { added: [], removed: [] };
  globalThis.chrome = {
    i18n: chromeI18n,
    permissions: {
      contains: mock.fn(async ({ origins }) =>
        origins.every((origin) => granted.includes(origin)),
      ),
      onAdded: { addListener: (listener) => listeners.added.push(listener) },
      onRemoved: {
        addListener: (listener) => listeners.removed.push(listener),
      },
    },
    scripting: {
      getRegisteredContentScripts: async () => registered.map((id) => ({ id })),
      registerContentScripts: mock.fn(async () => {}),
      unregisterContentScripts: mock.fn(async () => {}),
    },
  };
  return listeners;
};

const calls = (fn) => fn.mock.calls.map(({ arguments: args }) => args[0]);

describe('syncSiteScripts', () => {
  afterEach(() => {
    globalThis.chrome = { i18n: chromeI18n };
  });

  it('registers the scripts of a site the user granted', async () => {
    mockChrome({ granted: ['https://judge.example/*'], registered: [] });

    await syncSiteScripts(SITES);

    assert.deepEqual(calls(chrome.scripting.registerContentScripts), [
      [SCRIPT],
    ]);
    assert.equal(chrome.scripting.unregisterContentScripts.mock.callCount(), 0);
  });

  it('changes nothing when the scripts are already registered', async () => {
    mockChrome({
      granted: ['https://judge.example/*'],
      registered: ['demo-judge'],
    });

    await syncSiteScripts(SITES);

    assert.equal(chrome.scripting.registerContentScripts.mock.callCount(), 0);
    assert.equal(chrome.scripting.unregisterContentScripts.mock.callCount(), 0);
  });

  it('unregisters the scripts of a site whose permission was removed', async () => {
    mockChrome({ granted: [], registered: ['demo-judge'] });

    await syncSiteScripts(SITES);

    assert.deepEqual(calls(chrome.scripting.unregisterContentScripts), [
      { ids: ['demo-judge'] },
    ]);
    assert.equal(chrome.scripting.registerContentScripts.mock.callCount(), 0);
  });

  it('leaves the required sites to the manifest', async () => {
    mockChrome({ granted: [], registered: [] });

    await syncSiteScripts(SITES);

    assert.deepEqual(calls(chrome.permissions.contains), [
      { origins: ['https://judge.example/*'] },
    ]);
  });
});

describe('initializeSitePermissions', () => {
  let consoleError;

  beforeEach(() => {
    consoleError = mock.method(console, 'error', () => {});
  });

  afterEach(() => {
    mock.restoreAll();
    globalThis.chrome = { i18n: chromeI18n };
  });

  const settle = () => new Promise(setImmediate);

  it('syncs now, and when a permission is granted or removed', async () => {
    const granted = [];
    const listeners = mockChrome({ granted, registered: [] });

    initializeSitePermissions(SITES);
    await settle();
    assert.equal(chrome.scripting.registerContentScripts.mock.callCount(), 0);

    granted.push('https://judge.example/*');
    listeners.added.forEach((listener) => listener());
    await settle();
    assert.equal(chrome.scripting.registerContentScripts.mock.callCount(), 1);

    assert.equal(listeners.removed.length, 1);
  });

  it('logs a failure instead of throwing', async () => {
    mockChrome({ granted: ['https://judge.example/*'], registered: [] });
    chrome.scripting.registerContentScripts = async () => {
      throw new Error('Duplicate script ID');
    };

    initializeSitePermissions(SITES);
    await settle();

    assert.equal(consoleError.mock.callCount(), 1);
  });
});
