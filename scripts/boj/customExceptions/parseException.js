class parseException extends Error {
  constructor(message) {
    super(message);
    this.name = 'parseException';
  }
}
