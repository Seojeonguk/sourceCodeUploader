import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import {
  commit,
  getAuthenticatedUserRepositories,
} from '../../scripts/github/services/repoService.js';
import { encodeBase64Unicode } from '../../scripts/common/utils/encoding.js';

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

  describe('when the commit times out', () => {
    const FILE_URL =
      'https://github.com/user/solutions/blob/main/Programmers/폰켓몬.py';

    const jsonResponse = (body, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });

    /**
     * Mocks GitHub: the file is not found, the commit times out,
     * and the file is read again after the timeout.
     * @param {Response} fileAfterTimeout - The response of the second read.
     */
    const mockTimedOutCommit = (fileAfterTimeout) => {
      let reads = 0;
      globalThis.fetch = mock.fn(async (url, { method }) => {
        if (method === 'PUT') {
          throw new DOMException('The operation was aborted.', 'AbortError');
        }
        reads += 1;
        return reads === 1
          ? jsonResponse({ message: 'Not Found' }, 404)
          : fileAfterTimeout;
      });
    };

    beforeEach(() => {
      mockStorage(settings);
      mock.method(console, 'warn', () => {});
    });

    it('reports the file if GitHub committed it before the timeout', async () => {
      mockTimedOutCommit(
        jsonResponse({
          sha: 'sha',
          // The contents API breaks the base64 content into lines.
          content: `${encodeBase64Unicode(payload.sourceCode)}
`,
          html_url: FILE_URL,
        }),
      );

      assert.equal(await commit(payload), FILE_URL);
      assert.equal(globalThis.fetch.mock.callCount(), 3);
    });

    it('reports the timeout if the file was not committed', async () => {
      mockTimedOutCommit(jsonResponse({ message: 'Not Found' }, 404));

      await assert.rejects(commit(payload), {
        name: 'TimeoutException',
        mayBeApplied: true,
      });
    });
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
