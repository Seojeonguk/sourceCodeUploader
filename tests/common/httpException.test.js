import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HttpException } from '../../scripts/common/exception/index.js';

describe('HttpException', () => {
  describe('message', () => {
    it('uses the message from a Notion error', () => {
      const error = new HttpException(404, {
        object: 'error',
        status: 404,
        code: 'object_not_found',
        message:
          'Could not find database with ID: 1234. Make sure the relevant pages and databases are shared with your integration.',
      });

      assert.equal(
        error.message,
        'Could not find database with ID: 1234. Make sure the relevant pages and databases are shared with your integration. (HTTP 404)',
      );
    });

    it('uses the message from a GitHub error', () => {
      const error = new HttpException(403, {
        message: 'API rate limit exceeded for user ID 1.',
        documentation_url: 'https://docs.github.com/rest',
      });

      assert.equal(
        error.message,
        'API rate limit exceeded for user ID 1. (HTTP 403)',
      );
    });

    it('uses error_description, then error, from an OAuth error', () => {
      assert.equal(
        new HttpException(400, {
          error: 'invalid_grant',
          error_description: 'The authorization code has expired.',
        }).message,
        'The authorization code has expired. (HTTP 400)',
      );
      assert.equal(
        new HttpException(403, { error: 'forbidden_origin' }).message,
        'forbidden_origin (HTTP 403)',
      );
    });

    it('falls back to the status when the body has no message', () => {
      assert.equal(
        new HttpException(429, {}).message,
        'Too many requests. Try again in a moment. (HTTP 429)',
      );
      assert.equal(
        new HttpException(503, '<html>Service Unavailable</html>').message,
        'The server could not handle the request. Try again later. (HTTP 503)',
      );
      assert.equal(
        new HttpException(400, { message: '  ' }).message,
        'The request failed. (HTTP 400)',
      );
      assert.equal(
        new HttpException(404).message,
        'The request failed. (HTTP 404)',
      );
    });
  });

  it('keeps the status and the body', () => {
    const body = { message: 'Not Found' };
    const error = new HttpException(404, body);

    assert.equal(error.name, 'HttpException');
    assert.equal(error.status, 404);
    assert.equal(error.statusCode, 404);
    assert.equal(error.body, body);
  });
});
