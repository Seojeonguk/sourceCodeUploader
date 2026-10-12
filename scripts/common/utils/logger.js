const PREFIX = '[SCU]';
const MASK = '***';
const SENSITIVE_KEY_PATTERN = /token|secret|authorization|password/i;

/**
 * Checks whether a key holds a sensitive value, such as an access token.
 * @param {string} key - The key to check.
 * @returns {boolean} True if the value of the key should not be logged.
 */
export const isSensitiveKey = (key) => SENSITIVE_KEY_PATTERN.test(String(key));

/**
 * Masks the value if the key holds a sensitive value.
 * @param {string} key - The key of the value.
 * @param {*} value - The value to log.
 * @returns {*} The masked value, or the value itself.
 */
export const maskSensitiveValue = (key, value) =>
  isSensitiveKey(key) && value !== undefined && value !== null ? MASK : value;

/**
 * Returns a copy of the object with sensitive fields masked.
 * @param {Object} object - The object to log, such as request headers.
 * @returns {Object} The masked copy.
 */
export const maskSensitiveFields = (object) => {
  if (!object || typeof object !== 'object') {
    return object;
  }

  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => [
      key,
      maskSensitiveValue(key, value),
    ]),
  );
};

/* eslint-disable no-console -- the logger is the only place that writes to the console */
/**
 * Writes logs with the `[SCU]` prefix.
 */
export const logger = Object.freeze({
  debug: (...args) => console.debug(PREFIX, ...args),
  warn: (...args) => console.warn(PREFIX, ...args),
  error: (...args) => console.error(PREFIX, ...args),
});
/* eslint-enable no-console */
