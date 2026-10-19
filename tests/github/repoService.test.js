import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import {
  commit,
  getAuthenticatedUserRepositories,
} from '../../scripts/github/services/repoService.js';
import { encodeBase64Unicode } from '../../scripts/common/utils/encoding.js';
import { jsonResponse } from '../helpers/chrome.js';
import { chromeI18n } from '../helpers/i18n.js';

const payload = {
  type: 'Programmers',
  problemId: '1845',
  title: '폰켓몬',
  extension: 'py',
  sourceCode: 'print(1)',
};

const settings = {
  githubAccessToken: 'token',
  githubRefreshToken: 'refresh-token',
  // Valid for another hour, so it is not refreshed.
  githubTokenExpiresAt: Date.now() + 60 * 60 * 1000,
  githubLoginType: 'app',
  githubID: 'user',
  githubUploadedRepository: 'solutions',
};

const mockStorage = (storage) => {
  globalThis.chrome = {
    i18n: chromeI18n,
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

  it('asks to install the App when GitHub cannot reach the repository', async () => {
    mockStorage(settings);
    mock.method(console, 'warn', () => {});
    // GitHub answers 404 for a repository the App is not installed on.
    globalThis.fetch = mock.fn(async () =>
      jsonResponse({ message: 'Not Found' }, 404),
    );

    await assert.rejects(commit(payload), {
      name: 'SetupRequiredException',
      message:
        'Install the Source Code Uploader GitHub App on the selected repository, or select another repository in the extension popup.',
    });
    assert.deepEqual(
      globalThis.fetch.mock.calls.map(({ arguments: [, init] }) => init.method),
      ['GET', 'PUT'],
    );
  });

  describe('when the commit times out', () => {
    const FILE_URL =
      'https://github.com/user/solutions/blob/main/Programmers/폰켓몬.py';

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
  const repository = (name, owner = 'user') => ({
    name,
    owner: { login: owner },
  });

  /**
   * Mocks the installations of the GitHub App and their repositories.
   * @param {Object<number, Object[]>} repositoriesByInstallation - The repositories of each installation.
   * @returns {string[]} The requested URLs.
   */
  const mockInstallations = (repositoriesByInstallation) => {
    const urls = [];
    globalThis.fetch = mock.fn(async (url) => {
      urls.push(url);
      const { pathname, searchParams } = new URL(url);
      const page = Number(searchParams.get('page'));
      if (pathname === '/user/installations') {
        const installations = Object.keys(repositoriesByInstallation).map(
          (id) => ({ id: Number(id) }),
        );
        return jsonResponse({
          total_count: installations.length,
          installations: page === 1 ? installations : [],
        });
      }
      const id = pathname.match(/installations\/(\d+)\/repositories/)[1];
      const all = repositoriesByInstallation[id];
      return jsonResponse({
        total_count: all.length,
        repositories: all.slice((page - 1) * 100, page * 100),
      });
    });
    return urls;
  };

  beforeEach(() => {
    mock.method(console, 'debug', () => {});
    mockStorage(settings);
  });

  afterEach(() => {
    mock.restoreAll();
    delete globalThis.chrome;
  });

  it('lists the repositories the App is installed on, only the ones of the user', async () => {
    const urls = mockInstallations({
      1: [repository('solutions'), repository('algorithms')],
      2: [repository('team-repo', 'some-org')],
    });

    const repositories = await getAuthenticatedUserRepositories();

    assert.deepEqual(
      repositories.map(({ name }) => name),
      ['solutions', 'algorithms'],
    );
    assert.ok(
      urls.some((url) => url.includes('/user/installations/1/repositories')),
    );
    assert.ok(
      urls.some((url) => url.includes('/user/installations/2/repositories')),
    );
  });

  it('follows every page of the repositories', async () => {
    const many = Array.from({ length: 150 }, (_, i) => repository(`r${i}`));
    mockInstallations({ 1: many });

    const repositories = await getAuthenticatedUserRepositories();

    assert.equal(repositories.length, 150);
  });

  it('lists nothing until the App is installed', async () => {
    mockInstallations({});

    assert.deepEqual(await getAuthenticatedUserRepositories(), []);
  });

  it('asks to log in without the access token', async () => {
    mockStorage({});

    await assert.rejects(getAuthenticatedUserRepositories(), {
      name: 'SetupRequiredException',
    });
  });
});
