import { t } from '../utils/i18n.js';

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
        return t('oauthState', platform);
      case 'window_closed':
        return t('oauthWindowClosed', platform);
      case 'access_denied':
        return t('oauthAccessDenied', platform);
      default:
        return t('oauthOther', platform, reason);
    }
  }
}
