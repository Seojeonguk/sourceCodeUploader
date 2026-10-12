/**
 * Sends a message to the background script.
 * @param {string} platform - The platform to which the message is sent.
 * @param {string} action - The action to be performed by the background script.
 * @param {any} payload - The payload data to be sent along with the message.
 * @returns {Promise<any>} A promise that resolves with the response from the background script.
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
        resolve(response);
      },
    );
  });

export const getResourceURL = (path) => chrome.runtime.getURL(path);
