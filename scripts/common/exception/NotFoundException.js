export class NotFoundException extends Error {
  constructor(platform, target) {
    const message = `Not found ${target} for ${platform}.`;
    super(message);
    this.name = 'NotFoundException';
    this.statusCode = 401;

    // Error 스택 트레이스를 올바르게 캡처하기 위함
    Error.captureStackTrace(this, this.constructor);
  }
}
