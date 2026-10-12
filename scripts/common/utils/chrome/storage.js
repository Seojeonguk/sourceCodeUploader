import { logger, maskSensitiveValue } from '../logger.js';

/**
 * Reads a value from local storage asynchronously.
 * @param {string} key - The key of the value to be read from local storage.
 * @returns {Promise<any>} A promise that resolves with the value from local storage.
 */
export const getChromeStorage = async (key) =>
  new Promise((resolve) => {
    chrome.storage.local.get([key], (res) => {
      logger.debug(
        `[Storage] Getting key '${key}' with value '${maskSensitiveValue(key, res[key])}'`,
      );
      resolve(res[key]);
    });
  });

/**
 * Removes a value from Chrome local storage.
 * @param {string} key - The key used to remove the value from storage.
 */
export const removeChromeStorage = (key) => {
  logger.debug(`[Storage] Removing key '${key}'`);
  chrome.storage.local.remove([key]);
};

/**
 * Sets a value in Chrome local storage.
 * @param {string} key - The key used to set the value in storage.
 * @param {any} value - The value to be stored in local storage.
 */
export const setChromeStorage = (key, value) => {
  logger.debug(
    `[Storage] Saving key '${key}' with value '${maskSensitiveValue(key, value)}'`,
  );
  chrome.storage.local.set({ [key]: value });
};
