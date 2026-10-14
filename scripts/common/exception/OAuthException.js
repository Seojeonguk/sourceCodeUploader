export class OAuthException extends Error {
  /**
   * Thrown when an OAuth login cannot be completed.
   * @param {string} platform - The platform, such as `Notion`.
   * @param {string} reason - `state` if the login is unknown, used or expired,
   *   otherwise the `error` that the platform sent with the redirect, such as `access_denied`.
   */
  constructor(platform, reason) {
    super(OAuthException.createMessage(platform, reason));
    this.name = 'OAuthException';
    this.reason = reason;
    this.statusCode = 400;

    // Error 스택 트레이스를 올바르게 캡처하기 위함
    Error.captureStackTrace(this, this.constructor);
  }

  static createMessage(platform, reason) {
    switch (reason) {
      case 'state':
        return 'This login has expired or was already used.';
      case 'access_denied':
        return `Access to ${platform} was not allowed.`;
      default:
        return `${platform} could not complete the login (${reason}).`;
    }
  }
}
