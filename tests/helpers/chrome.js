import { chromeI18n } from './i18n.js';

/**
 * Mocks `chrome.storage.local` with an in-memory object.
 * @param {Object} [initial={}] - The initial values.
 * @returns {Object} The stored values, which the tests can check.
 */
export const mockChromeStorage = (initial = {}) => {
  const storage = { ...initial };

  globalThis.chrome = {
    i18n: chromeI18n,
    storage: {
      local: {
        get: ([key], callback) => callback({ [key]: storage[key] }),
        set: async (values) => {
          Object.assign(storage, values);
        },
        remove: async (keys) => {
          [keys].flat().forEach((key) => delete storage[key]);
        },
      },
    },
  };

  return storage;
};

/**
 * Mocks `chrome.storage.session` and `chrome.tabs` on top of `mockChromeStorage()`,
 * for the OAuth flow.
 * @returns {{ session: Object, createdTabs: Object[], removedTabIds: number[] }}
 *   The session values and the tabs, which the tests can check.
 */
export const mockChromeSessionAndTabs = () => {
  const session = {};
  const createdTabs = [];
  const removedTabIds = [];

  globalThis.chrome.storage.session = {
    get: async (key) => ({ [key]: structuredClone(session[key]) }),
    set: async (values) => Object.assign(session, structuredClone(values)),
    remove: async (keys) => {
      [keys].flat().forEach((key) => delete session[key]);
    },
  };
  globalThis.chrome.tabs = {
    create: async ({ url }) => {
      const tab = { id: 100 + createdTabs.length, url };
      createdTabs.push(tab);
      return tab;
    },
    remove: async (tabId) => {
      removedTabIds.push(tabId);
    },
  };

  return { session, createdTabs, removedTabIds };
};

/**
 * Creates a JSON response for a mocked `fetch`.
 * @param {Object} body - The response body.
 * @param {number} [status=200] - The HTTP status code.
 * @returns {Response}
 */
export const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
