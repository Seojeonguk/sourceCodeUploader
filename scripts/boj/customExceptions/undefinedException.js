class undefinedException extends Error {
  constructor(message) {
    super(message);
    this.name = 'undefinedException';
  }
}
