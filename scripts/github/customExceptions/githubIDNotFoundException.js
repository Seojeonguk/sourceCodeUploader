export class githubIDNotFoundException extends Error {
  constructor(message) {
    super(message);
    this.name = 'githubIDNotFoundException';
  }
}
