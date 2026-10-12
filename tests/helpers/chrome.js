/**
 * Mocks `chrome.storage.local` with an in-memory object.
 * @param {Object} [initial={}] - The initial values.
 * @returns {Object} The stored values, which the tests can check.
 */
export const mockChromeStorage = (initial = {}) => {
  const storage = { ...initial };

  globalThis.chrome = {
    storage: {
      local: {
        get: ([key], callback) => callback({ [key]: storage[key] }),
        set: (values) => Object.assign(storage, values),
        remove: async (keys) => {
          [keys].flat().forEach((key) => delete storage[key]);
        },
      },
    },
  };

  return storage;
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
