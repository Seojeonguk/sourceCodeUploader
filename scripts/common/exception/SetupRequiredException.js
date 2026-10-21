import { t } from '../utils/i18n.js';

export class SetupRequiredException extends Error {
  /**
   * Thrown when the user has not finished the setup in the popup.
   * @param {string} platform - The platform, such as `GitHub`.
   * @param {'login'|'login-expired'|'proxy'|'repository'|'database'|'database-again'|'login-upgrade'|'app-install'} setting - The missing setting.
   * @param {{ cause?: Error }} [options] - The error that showed the setting is missing.
   */
  constructor(platform, setting, options = undefined) {
    super(SetupRequiredException.createMessage(platform, setting), options);
    this.name = 'SetupRequiredException';
    this.statusCode = 400;

    // Error 스택 트레이스를 올바르게 캡처하기 위함
    Error.captureStackTrace(this, this.constructor);
  }

  static createMessage(platform, setting) {
    switch (setting) {
      case 'login':
        return t('setupLogin', platform);
      case 'proxy':
        return t('setupProxy', platform);
      case 'login-expired':
        return t('setupLoginExpired', platform);
      case 'login-upgrade':
        return t('setupLoginUpgrade', platform);
      case 'app-install':
        return t('setupAppInstall', platform);
      case 'database-again':
        return t('setupDatabaseAgain', platform);
      case 'repository':
        return t('setupRepository', platform);
      case 'database':
        return t('setupDatabase', platform);
      default:
        return `Select a ${platform} ${setting} in the extension popup first.`;
    }
  }
}
