export class SetupRequiredException extends Error {
  /**
   * Thrown when the user has not finished the setup in the popup.
   * @param {string} platform - The platform, such as `GitHub`.
   * @param {'login'|'repository'|'database'} setting - The missing setting.
   */
  constructor(platform, setting) {
    const message =
      setting === 'login'
        ? `Log in to ${platform} in the extension popup first.`
        : `Select a ${platform} ${setting} in the extension popup first.`;
    super(message);
    this.name = 'SetupRequiredException';
    this.statusCode = 400;

    // Error 스택 트레이스를 올바르게 캡처하기 위함
    Error.captureStackTrace(this, this.constructor);
  }
}
