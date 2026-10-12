export class HttpException extends Error {
  /**
   * Thrown when an API responds with an error status.
   * @param {number} status - The HTTP status code.
   */
  constructor(status) {
    super(`HTTP error! Status: ${status}`);
    this.name = 'HttpException';
    this.status = status;
    this.statusCode = status;

    // Error 스택 트레이스를 올바르게 캡처하기 위함
    Error.captureStackTrace(this, this.constructor);
  }
}
