export class duplicateContentException extends Error {
  constructor(message) {
    super(message);
    this.name = 'duplicateContentException';
  }
}
