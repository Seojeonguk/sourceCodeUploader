export class SetupRequiredException extends Error {
  /**
   * Thrown when the user has not finished the setup in the popup.
   * @param {string} platform - The platform, such as `GitHub`.
   * @param {'login'|'login-expired'|'proxy'|'repository'|'database'|'database-again'|'login-upgrade'} setting - The missing setting.
   */
  constructor(platform, setting) {
    super(SetupRequiredException.createMessage(platform, setting));
    this.name = 'SetupRequiredException';
    this.statusCode = 400;

    // Error 스택 트레이스를 올바르게 캡처하기 위함
    Error.captureStackTrace(this, this.constructor);
  }

  static createMessage(platform, setting) {
    switch (setting) {
      case 'login':
        return `Log in to ${platform} in the extension popup first.`;
      case 'proxy':
        return `Set the URL of the ${platform} token proxy (TOKEN_PROXY_URL) in the extension config first.`;
      case 'login-expired':
        return `Your ${platform} login has expired. Log in again in the extension popup.`;
      case 'login-upgrade':
        return `The ${platform} login now uses only the repositories you choose. Log in again in the extension popup.`;
      case 'database-again':
        return `Select the ${platform} database again in the extension popup. The saved one could not be matched to a single data source.`;
      default:
        return `Select a ${platform} ${setting} in the extension popup first.`;
    }
  }
}
