import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import {
  isSensitiveKey,
  logger,
  maskSensitiveFields,
  maskSensitiveValue,
} from '../../scripts/common/utils/logger.js';

describe('isSensitiveKey', () => {
  it('detects storage keys that hold access tokens', () => {
    assert.equal(isSensitiveKey('githubAccessToken'), true);
    assert.equal(isSensitiveKey('notionAccessToken'), true);
  });

  it('detects credential headers and fields', () => {
    assert.equal(isSensitiveKey('Authorization'), true);
    assert.equal(isSensitiveKey('client_secret'), true);
  });

  it('does not flag normal keys', () => {
    assert.equal(isSensitiveKey('githubID'), false);
    assert.equal(isSensitiveKey('githubUploadedRepository'), false);
    assert.equal(isSensitiveKey('notionUploadedDatabaseId'), false);
  });
});

describe('maskSensitiveValue', () => {
  it('masks the value of a sensitive key', () => {
    assert.equal(maskSensitiveValue('githubAccessToken', 'gho_abc'), '***');
  });

  it('keeps the value of a normal key', () => {
    assert.equal(maskSensitiveValue('githubID', 'Seojeonguk'), 'Seojeonguk');
  });

  it('keeps an empty value so missing tokens are still visible', () => {
    assert.equal(maskSensitiveValue('githubAccessToken', undefined), undefined);
    assert.equal(maskSensitiveValue('githubAccessToken', null), null);
  });
});

describe('maskSensitiveFields', () => {
  it('masks the Authorization header and keeps the others', () => {
    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer gho_abc',
    };

    assert.deepEqual(maskSensitiveFields(headers), {
      Accept: 'application/vnd.github+json',
      Authorization: '***',
    });
  });

  it('does not change the original object', () => {
    const headers = { Authorization: 'Bearer gho_abc' };
    maskSensitiveFields(headers);

    assert.equal(headers.Authorization, 'Bearer gho_abc');
  });

  it('returns non-object values as they are', () => {
    assert.equal(maskSensitiveFields(undefined), undefined);
  });
});

describe('logger', () => {
  it('adds the [SCU] prefix', () => {
    const debug = mock.method(console, 'debug', () => {});

    logger.debug('hello', 1);

    assert.deepEqual(debug.mock.calls[0].arguments, ['[SCU]', 'hello', 1]);
    debug.mock.restore();
  });
});
