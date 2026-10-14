export class ForbiddenSenderException extends Error {
  /**
   * Thrown when a page sends a message that it is not allowed to send,
   * such as a judge page asking for the list of repositories.
   * @param {string} platform - The platform of the message.
   * @param {string} action - The action of the message.
   */
  constructor(platform, action) {
    super(`${platform}/${action} cannot be requested from this page.`);
    this.name = 'ForbiddenSenderException';
    this.statusCode = 403;

    // Error 스택 트레이스를 올바르게 캡처하기 위함
    Error.captureStackTrace(this, this.constructor);
  }
}
