/**
 * Sends a message to the background script.
 * If the background does not answer, such as when it failed to start, the response is
 * `{ ok: false, message }` like any other failure, so the caller can show the error.
 * @param {string} platform - The platform to which the message is sent.
 * @param {string} action - The action to be performed by the background script.
 * @param {any} payload - The payload data to be sent along with the message.
 * @returns {Promise<{ ok: boolean, message: any }>} The response from the background script.
 */
export const sendMessage = (platform, action, payload) =>
  new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        platform,
        action,
        payload,
      },
      (response) => {
        // Reading lastError also keeps Chrome from logging it as unchecked.
        const error = chrome.runtime.lastError;
        if (error || response === undefined) {
          resolve({
            ok: false,
            message:
              error?.message ?? 'The extension did not respond. Try again.',
          });
          return;
        }
        resolve(response);
      },
    );
  });

export const getResourceURL = (path) => chrome.runtime.getURL(path);
