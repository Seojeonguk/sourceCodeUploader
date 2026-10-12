export class HttpException extends Error {
  /**
   * Thrown when an API responds with an error status.
   * @param {number} status - The HTTP status code.
   * @param {*} [body] - The response body, such as the error from the API.
   */
  constructor(status, body = undefined) {
    super(`HTTP error! Status: ${status}`);
    this.name = 'HttpException';
    this.status = status;
    this.body = body;
    this.statusCode = status;

    // Error 스택 트레이스를 올바르게 캡처하기 위함
    Error.captureStackTrace(this, this.constructor);
  }
}
