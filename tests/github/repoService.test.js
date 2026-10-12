import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import {
  commit,
  getAuthenticatedUserRepositories,
} from '../../scripts/github/services/repoService.js';

const payload = {
  type: 'Programmers',
  problemId: '1845',
  title: '폰켓몬',
  extension: 'py',
  sourceCode: 'print(1)',
};

const settings = {
  githubAccessToken: 'token',
  githubID: 'user',
  githubUploadedRepository: 'solutions',
};

const mockStorage = (storage) => {
  globalThis.chrome = {
    storage: {
      local: { get: ([key], callback) => callback({ [key]: storage[key] }) },
    },
  };
};

describe('commit', () => {
  beforeEach(() => {
    globalThis.fetch = mock.fn(async () => {
      throw new Error('fetch should not be called');
    });
    mock.method(console, 'debug', () => {});
  });

  afterEach(() => {
    mock.restoreAll();
    delete globalThis.chrome;
  });

  [
    ['the access token', 'githubAccessToken'],
    ['the GitHub ID', 'githubID'],
  ].forEach(([name, key]) => {
    it(`asks to log in without ${name}`, async () => {
      mockStorage({ ...settings, [key]: undefined });

      await assert.rejects(commit(payload), {
        name: 'SetupRequiredException',
        message: 'Log in to GitHub in the extension popup first.',
      });
      assert.equal(globalThis.fetch.mock.callCount(), 0);
    });
  });

  it('asks to select a repository without the repository', async () => {
    mockStorage({ ...settings, githubUploadedRepository: undefined });

    await assert.rejects(commit(payload), {
      name: 'SetupRequiredException',
      message: 'Select a GitHub repository in the extension popup first.',
    });
    assert.equal(globalThis.fetch.mock.callCount(), 0);
  });
});

describe('getAuthenticatedUserRepositories', () => {
  afterEach(() => {
    mock.restoreAll();
    delete globalThis.chrome;
  });

  it('asks to log in without the access token', async () => {
    mock.method(console, 'debug', () => {});
    mockStorage({});

    await assert.rejects(getAuthenticatedUserRepositories(), {
      name: 'SetupRequiredException',
    });
  });
});
