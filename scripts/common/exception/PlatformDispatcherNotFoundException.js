export class PlatformDispatcherNotFoundException extends Error {
  constructor(platform) {
    const message = `No dispatcher found for ${platform} platform.`;
    super(message);
    this.name = 'PlatformDispatcherNotFoundException';
    this.statusCode = 401;

    // Error 스택 트레이스를 올바르게 캡처하기 위함
    Error.captureStackTrace(this, this.constructor);
  }
}
