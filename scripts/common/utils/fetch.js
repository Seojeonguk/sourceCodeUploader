import { HttpException } from '../exception/HttpException.js';
import { TimeoutException } from '../exception/TimeoutException.js';
import { logger, maskSensitiveFields } from './logger.js';

// Requests that do not change anything on the server, so they are safe to send again.
// POST / PUT / PATCH / DELETE may have been applied before the network error or the timeout,
// so sending them again can create a duplicate Notion page, for example.
const RETRYABLE_METHODS = Object.freeze(['GET', 'HEAD']);

// Server errors that may pass if the same request is sent again. Only reads are sent again for them.
const RETRYABLE_STATUSES = Object.freeze([500, 502, 503, 504]);

// The longest wait asked by `Retry-After` that is waited for.
// The service worker can be stopped while it waits, so a longer wait is reported to the user instead.
const MAX_RETRY_AFTER = 10000;

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
 * Reads the `Retry-After` header, which is a number of seconds or an HTTP date.
 * @param {?string} value - The header value.
 * @returns {?number} The time to wait in milliseconds, or null if there is no valid value.
 */
export const parseRetryAfter = (value) => {
  if (!value) {
    return null;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.max(seconds, 0) * 1000;
  }

  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(date - Date.now(), 0);
};

/**
 * Checks whether the API refused the request because too many requests were sent.
 * Notion answers 429, and GitHub answers 403 or 429 with `Retry-After` for its secondary rate limit.
 * The request was not applied, so it can be sent again whatever the method is.
 * @param {HttpException} error
 * @returns {boolean}
 */
const isRateLimited = (error) =>
  error.status === 429 || (error.status === 403 && error.retryAfter !== null);

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
      throw new HttpException(
        response.status,
        responseBody,
        parseRetryAfter(response.headers.get('Retry-After')),
      );
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
 * Finds how long to wait before sending the request again.
 * @param {Error} error - The error of the last attempt.
 * @param {boolean} isRead - Whether the request is a GET or a HEAD.
 * @param {number} retryDelay - The delay of the exponential backoff.
 * @returns {?number} The delay in milliseconds, or null if the request must not be sent again.
 */
const getRetryDelay = (error, isRead, retryDelay) => {
  if (!(error instanceof HttpException)) {
    // A network error or a timeout: a write may have been applied.
    return isRead ? retryDelay : null;
  }
  if (isRateLimited(error)) {
    const delay = error.retryAfter ?? retryDelay;
    return delay <= MAX_RETRY_AFTER ? delay : null;
  }
  if (isRead && RETRYABLE_STATUSES.includes(error.status)) {
    return retryDelay;
  }
  return null;
};

/**
 * Sends a request, and sends it again when that is safe:
 * - GET / HEAD after a network error, a timeout or a server error (500, 502, 503, 504),
 * - any method after a rate limit (429), waiting as long as `Retry-After` asks, up to 10 seconds.
 * @param {string} url
 * @param {string} method - The HTTP method.
 * @param {Object} [headers]
 * @param {*} [body]
 * @param {Object} [options]
 * @param {number} [options.retries=3] - How many times to send the request again.
 * @param {number} [options.timeout] - The timeout of each attempt in milliseconds.
 *   5 seconds for GET / HEAD, and 30 seconds for the other methods.
 * @param {number} [options.retryDelay=500] - The delay before the first retry, doubled each time.
 * @throws {HttpException} If the response has an error status, after the retries.
 * @returns {Promise<*>} The response body: JSON, text, or an empty string.
 */
export const request = async (
  url,
  method,
  headers,
  body,
  { retries = 3, timeout = undefined, retryDelay = 500 } = {},
) => {
  const isRead = RETRYABLE_METHODS.includes(method.toUpperCase());
  const attemptTimeout = timeout ?? (isRead ? READ_TIMEOUT : WRITE_TIMEOUT);

  try {
    return await send(url, method, headers, body, attemptTimeout);
  } catch (error) {
    const delay = getRetryDelay(error, isRead, retryDelay);
    if (retries <= 0 || delay === null) {
      throw error;
    }

    logger.warn(`Request failed, retrying... (${retries} retries left)`);
    await wait(delay);

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
