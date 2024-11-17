export class accessTokenNotFoundException extends Error {
  constructor(message) {
    super(message);
    this.name = 'accessTokenNotFoundException';
  }
}
