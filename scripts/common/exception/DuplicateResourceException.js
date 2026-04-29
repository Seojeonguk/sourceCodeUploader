export class DuplicateResourceException extends Error {
  constructor(platform, target) {
    const message = `Duplicate ${target} detected on ${platform}.`;
    super(message);
    this.name = 'DuplicateResourceException';
    this.statusCode = 401;

    // Error 스택 트레이스를 올바르게 캡처하기 위함
    Error.captureStackTrace(this, this.constructor);
  }
}
