export class ParseException extends Error {
  constructor(message) {
    const message = message;
    super(message);
    this.name = 'ParseException';
    this.statusCode = 401;

    // Error 스택 트레이스를 올바르게 캡처하기 위함
    Error.captureStackTrace(this, this.constructor);
  }
}
