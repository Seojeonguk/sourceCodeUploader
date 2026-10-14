export class HttpException extends Error {
  /**
   * Thrown when an API responds with an error status.
   * @param {number} status - The HTTP status code.
   * @param {*} [body] - The response body, such as the error from the API.
   * @param {?number} [retryAfter] - How long the API asks to wait before trying again, in milliseconds.
   */
  constructor(status, body = undefined, retryAfter = null) {
    super(HttpException.createMessage(status, body));
    this.name = 'HttpException';
    this.status = status;
    this.body = body;
    this.statusCode = status;
    this.retryAfter = retryAfter;

    // Error 스택 트레이스를 올바르게 캡처하기 위함
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Creates the message shown to the user.
   * GitHub and Notion explain the error in `message`, and OAuth errors use `error_description` / `error`,
   * so that text is used. Otherwise the message is chosen by the status.
   * @param {number} status - The HTTP status code.
   * @param {*} [body] - The response body.
   * @returns {string} The message, ending with the status.
   */
  static createMessage(status, body) {
    const apiMessage = [body?.message, body?.error_description, body?.error]
      .find((value) => typeof value === 'string' && value.trim() !== '')
      ?.trim();

    return `${apiMessage ?? HttpException.describeStatus(status)} (HTTP ${status})`;
  }

  static describeStatus(status) {
    if (status === 429) {
      return 'Too many requests. Try again in a moment.';
    }
    if (status >= 500) {
      return 'The server could not handle the request. Try again later.';
    }
    return 'The request failed.';
  }
}
