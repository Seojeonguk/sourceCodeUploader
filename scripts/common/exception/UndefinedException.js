export class UndefinedException extends Error {
  constructor(platform, target) {
    const message = `Not found ${target} for ${platform}.`;
    super(message);
    this.name = 'UndefinedException';
    this.statusCode = 401;

    // Error 스택 트레이스를 올바르게 캡처하기 위함
    Error.captureStackTrace(this, this.constructor);
  }
}
