/**
 * Checks if a given value is empty or not.
 * @param {*} value - The value to be checked.
 * @returns {boolean} True if the value is empty, otherwise false.
 */
export function isEmpty(value) {
  return (
    !value ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" && Object.keys(value).length === 0)
  );
}

/**
 * Sends a request to the specified URL with the given method, headers, and body.
 * @param {string} url - The URL to send the request to.
 * @param {string} method - The HTTP method to be used (e.g., 'GET', 'POST').
 * @param {Object} headers - The headers to be included in the request.
 * @param {any} body - The body of the request.
 * @returns {Promise<Response>} A promise that resolves with the response from the server.
 */
export async function request(url, method, headers, body) {
  return await fetch(url, {
    method: method,
    headers: headers,
    body: body,
  });
}

/**
 * Throws an error if the given value is falsy.
 * @param {*} value - The value to be checked.
 * @param {string} errorMessage - The error message to be thrown if the value is falsy.
 */
export function throwIfFalsy(value, errorMessage) {
  if (isEmpty(value)) {
    throw new Error(errorMessage);
  }
}

/**
 * Sends a message to the background script.
 * @param {string} platform - The platform to which the message is sent.
 * @param {string} action - The action to be performed by the background script.
 * @param {any} payload - The payload data to be sent along with the message.
 * @returns {Promise<any>} A promise that resolves with the response from the background script.
 */
export function sendMessage(platform, action, payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        platform: platform,
        action: action,
        payload: payload,
      },
      (response) => {
        resolve(response);
      }
    );
  });
}

/**
 * Reads a value from local storage asynchronously.
 * @param {string} key - The key of the value to be read from local storage.
 * @returns {Promise<any>} A promise that resolves with the value from local storage.
 */
export async function getChromeStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (res) => {
      resolve(res[key]);
    });
  });
}

/**
 * Removes a value from Chrome local storage.
 * @param {string} key - The key used to remove the value from storage.
 */
export function removeChromeStorage(key) {
  chrome.storage.local.remove([key]);
}

/**
 * Sets a value in Chrome local storage.
 * @param {string} key - The key used to set the value in storage.
 * @param {any} value - The value to be stored in local storage.
 */
export function setChromeStorage(key, value) {
  chrome.storage.local.set({ [key]: value });
}

export function getResourceURL(path) {
  return chrome.runtime.getURL(path);
}
