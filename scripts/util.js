/**
 * Sends a request to the specified URL with the given method, headers, and body.
 * @param {string} url - The URL to send the request to.
 * @param {string} method - The HTTP method to be used (e.g., 'GET', 'POST').
 * @param {Object} headers - The headers to be included in the request.
 * @param {any} body - The body of the request.
 * @returns {Promise<Response>} A promise that resolves with the response from the server.
 */
export const request = async (url, method, headers, body) => {
  return await fetch(url, {
    method: method,
    headers: headers,
    body: body,
  });
};

/**
 * Sends a message to the background script.
 * @param {string} platform - The platform to which the message is sent.
 * @param {string} action - The action to be performed by the background script.
 * @param {any} payload - The payload data to be sent along with the message.
 * @returns {Promise<any>} A promise that resolves with the response from the background script.
 */
export const sendMessage = (platform, action, payload) => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        platform: platform,
        action: action,
        payload: payload,
      },
      (response) => {
        resolve(response);
      },
    );
  });
};

/**
 * Reads a value from local storage asynchronously.
 * @param {string} key - The key of the value to be read from local storage.
 * @returns {Promise<any>} A promise that resolves with the value from local storage.
 */
export const getChromeStorage = async (key) => {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (res) => {
      resolve(res[key]);
    });
  });
};

/**
 * Removes a value from Chrome local storage.
 * @param {string} key - The key used to remove the value from storage.
 */
export const removeChromeStorage = (key) => {
  chrome.storage.local.remove([key]);
};

/**
 * Sets a value in Chrome local storage.
 * @param {string} key - The key used to set the value in storage.
 * @param {any} value - The value to be stored in local storage.
 */
export const setChromeStorage = (key, value) => {
  chrome.storage.local.set({ [key]: value });
};

export const getResourceURL = (path) => {
  return chrome.runtime.getURL(path);
};

export const closeLatestTab = () => {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.remove(tab.id);
    });
  });
};

export const encodeBase64Unicode = (str) => {
  const utf8Array = new TextEncoder().encode(str);
  const binaryString = String.fromCharCode(...utf8Array);
  return btoa(binaryString);
};
