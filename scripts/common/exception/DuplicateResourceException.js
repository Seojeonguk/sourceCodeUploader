import { t } from '../utils/i18n.js';

export class DuplicateResourceException extends Error {
  constructor(platform, target) {
    const message =
      target === 'content'
        ? t('duplicateContent', platform)
        : `Duplicate ${target} detected on ${platform}.`;
    super(message);
    this.name = 'DuplicateResourceException';
    this.statusCode = 409;

    // Error 스택 트레이스를 올바르게 캡처하기 위함
    Error.captureStackTrace(this, this.constructor);
  }
}
