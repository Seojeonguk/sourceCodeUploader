import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { setChromeStorage } from '../../scripts/common/utils/index.js';
import { mockChromeStorage } from '../helpers/chrome.js';

describe('setChromeStorage', () => {
  beforeEach(() => {
    mock.method(console, 'debug', () => {});
  });

  afterEach(() => {
    mock.restoreAll();
    delete globalThis.chrome;
  });

  it('resolves after the value is saved', async () => {
    const storage = mockChromeStorage();

    await setChromeStorage('githubUploadedRepository', 'algorithms');

    assert.equal(storage.githubUploadedRepository, 'algorithms');
  });

  it('rejects when saving fails', async () => {
    mockChromeStorage();
    globalThis.chrome.storage.local.set = async () => {
      throw new Error('QUOTA_BYTES quota exceeded');
    };

    await assert.rejects(setChromeStorage('key', 'value'), {
      message: 'QUOTA_BYTES quota exceeded',
    });
  });
});
