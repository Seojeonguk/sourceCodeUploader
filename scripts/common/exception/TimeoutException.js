export class TimeoutException extends Error {
  /**
   * Thrown when a request gets no response in time.
   * @param {string} method - The HTTP method of the request.
   * @param {boolean} [isRead] - Whether the request only reads, such as a POST that searches.
   *   By default, only GET and HEAD are.
   */
  constructor(method, isRead = ['GET', 'HEAD'].includes(method.toUpperCase())) {
    const mayBeApplied = !isRead;

    super(
      mayBeApplied
        ? 'The request timed out, but it may have been applied. Check the result before trying again.'
        : 'The request timed out. Try again later.',
    );
    this.name = 'TimeoutException';
    this.method = method;
    // A write may have reached the server before the timeout, so the caller can check the result.
    this.mayBeApplied = mayBeApplied;
    this.statusCode = 408;

    // Error 스택 트레이스를 올바르게 캡처하기 위함
    Error.captureStackTrace(this, this.constructor);
  }
}
