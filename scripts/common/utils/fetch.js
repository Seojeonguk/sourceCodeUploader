import { HttpException } from '../exception/HttpException.js';
import { TimeoutException } from '../exception/TimeoutException.js';
import { logger, maskSensitiveFields } from './logger.js';

// Requests that do not change anything on the server, so they are safe to send again.
// POST / PUT / PATCH / DELETE may have been applied before the network error or the timeout,
// so sending them again can create a duplicate Notion page, for example.
const RETRYABLE_METHODS = Object.freeze(['GET', 'HEAD']);

// A read is sent again after a timeout, so it gives up early.
const READ_TIMEOUT = 5000;
// A write is sent only once, and creating a Notion page with long code or committing a file can be slow.
// Giving up too early reports a failure for a request that the server is still applying.
const WRITE_TIMEOUT = 30000;

const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Reads the response body: JSON if the response says so, otherwise text.
 * A broken JSON body is returned as text, so the caller still gets the status.
 * @param {Response} response
 * @returns {Promise<*>} The body, or an empty string if there is none.
 */
const readBody = async (response) => {
  const text = await response.text();
  const contentType = response.headers.get('Content-Type') ?? '';

  if (!text || !contentType.includes('application/json')) {
    return text;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

/**
 * Sends a request once, aborting it after the timeout.
 * @throws {HttpException} If the response has an error status.
 * @throws {TimeoutException} If there is no response in time.
 * @throws {Error} A network error, such as `TypeError`.
 */
const send = async (url, method, headers, body, timeout) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    const responseBody = await readBody(response);

    if (!response.ok) {
      // The request body is not logged: it can contain OAuth credentials.
      logger.debug('Request failed', {
        response: responseBody,
        url,
        method,
        headers: maskSensitiveFields(headers),
      });
      throw new HttpException(response.status, responseBody);
    }

    return responseBody;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new TimeoutException(method);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Sends a request. GET requests are sent again after a network error or a timeout.
 * @param {string} url
 * @param {string} method - The HTTP method.
 * @param {Object} [headers]
 * @param {*} [body]
 * @param {Object} [options]
 * @param {number} [options.retries=3] - How many times to send a GET request again.
 * @param {number} [options.timeout] - The timeout of each attempt in milliseconds.
 *   5 seconds for GET / HEAD, and 30 seconds for the other methods.
 * @param {number} [options.retryDelay=500] - The delay before the first retry, doubled each time.
 * @throws {HttpException} If the response has an error status. It is not retried.
 * @returns {Promise<*>} The response body: JSON, text, or an empty string.
 */
export const request = async (
  url,
  method,
  headers,
  body,
  { retries = 3, timeout = undefined, retryDelay = 500 } = {},
) => {
  const canRetry = RETRYABLE_METHODS.includes(method.toUpperCase());
  const attemptTimeout = timeout ?? (canRetry ? READ_TIMEOUT : WRITE_TIMEOUT);

  try {
    return await send(url, method, headers, body, attemptTimeout);
  } catch (error) {
    if (!canRetry || retries <= 0 || error instanceof HttpException) {
      throw error;
    }

    logger.warn(`Request failed, retrying... (${retries} retries left)`);
    await wait(retryDelay);

    return request(url, method, headers, body, {
      retries: retries - 1,
      timeout: attemptTimeout,
      retryDelay: retryDelay * 2,
    });
  }
};

export const createGithubAuthHeader = (token) => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
});
