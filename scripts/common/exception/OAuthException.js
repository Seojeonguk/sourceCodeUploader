export class OAuthException extends Error {
  /**
   * Thrown when an OAuth login cannot be completed.
   * @param {string} platform - The platform, such as `Notion`.
   * @param {string} reason - `state` if the redirect is not for this login,
   *   `window_closed` if the login window was closed before the login finished,
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
        return `The ${platform} login could not be checked. Try again.`;
      case 'window_closed':
        return `The ${platform} login window was closed before the login finished.`;
      case 'access_denied':
        return `Access to ${platform} was not allowed.`;
      default:
        return `${platform} could not complete the login (${reason}).`;
    }
  }
}
