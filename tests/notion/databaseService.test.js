import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { upload } from '../../scripts/notion/services/databaseService.js';

const PAGE_URL = 'https://www.notion.so/existing-page';

const payload = {
  type: 'Programmers',
  problemId: '1845',
  extension: 'py',
  sourceCode: 'print(2)',
};

const problemInfo = {
  title: '폰켓몬',
  level: 'Lv. 1',
  tags: ['해시'],
  url: 'https://school.programmers.co.kr/learn/courses/30/lessons/1845',
};

const jsonResponse = (body) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

const codeBlock = (text) => ({
  id: 'code-block',
  type: 'code',
  code: { rich_text: [{ plain_text: text }] },
});

/**
 * Mocks the Notion API.
 * @param {Object} param
 * @param {?Object} param.existingPage - The page returned by the database query.
 * @param {Object[]} [param.blocks=[]] - The child blocks of the existing page.
 * @returns {Object[]} The requests sent to the API, as `{ method, path, body }`.
 */
const mockNotion = ({ existingPage, blocks = [] }) => {
  const requests = [];

  globalThis.fetch = mock.fn(async (url, { method, body }) => {
    const { pathname } = new URL(url);
    requests.push({ method, path: pathname, body: body && JSON.parse(body) });

    if (pathname.endsWith('/query')) {
      return jsonResponse({ results: existingPage ? [existingPage] : [] });
    }
    if (method === 'GET' && pathname.endsWith('/children')) {
      return jsonResponse({ results: blocks, has_more: false });
    }
    if (method === 'POST' && pathname === '/v1/pages') {
      return jsonResponse({ url: 'https://www.notion.so/new-page' });
    }
    return jsonResponse({});
  });

  return requests;
};

const mockStorage = (storage) => {
  globalThis.chrome = {
    storage: {
      local: { get: ([key], callback) => callback({ [key]: storage[key] }) },
    },
  };
};

describe('upload', () => {
  beforeEach(() => {
    mockStorage({
      notionAccessToken: 'token',
      notionUploadedDatabaseId: 'database-id',
    });
    mock.method(console, 'debug', () => {});
  });

  it('asks to log in without the access token', async () => {
    mockStorage({ notionUploadedDatabaseId: 'database-id' });
    const requests = mockNotion({ existingPage: null });

    await assert.rejects(upload(payload, problemInfo), {
      name: 'SetupRequiredException',
      message: 'Log in to Notion in the extension popup first.',
    });
    assert.equal(requests.length, 0);
  });

  it('asks to select a database without the database', async () => {
    mockStorage({ notionAccessToken: 'token' });
    const requests = mockNotion({ existingPage: null });

    await assert.rejects(upload(payload, problemInfo), {
      name: 'SetupRequiredException',
      message: 'Select a Notion database in the extension popup first.',
    });
    assert.equal(requests.length, 0);
  });

  afterEach(() => {
    mock.restoreAll();
    delete globalThis.chrome;
  });

  it('creates a page for a new problem', async () => {
    const requests = mockNotion({ existingPage: null });

    const url = await upload(payload, problemInfo);

    assert.equal(url, 'https://www.notion.so/new-page');
    assert.deepEqual(requests[0].body.filter, {
      property: 'URL',
      url: { equals: problemInfo.url },
    });
    assert.equal(requests.at(-1).method, 'POST');
    assert.equal(requests.at(-1).path, '/v1/pages');
  });

  it('does not upload the same source code again', async () => {
    const requests = mockNotion({
      existingPage: { id: 'page-id', url: PAGE_URL },
      blocks: [codeBlock('print(2)')],
    });

    await assert.rejects(upload(payload, problemInfo), {
      name: 'DuplicateResourceException',
    });
    assert.equal(
      requests.some(({ method }) => method === 'PATCH'),
      false,
    );
  });

  it('replaces the code block of the existing page', async () => {
    const requests = mockNotion({
      existingPage: { id: 'page-id', url: PAGE_URL },
      blocks: [codeBlock('print(1)')],
    });

    const url = await upload(payload, problemInfo);

    assert.equal(url, PAGE_URL);
    const blockUpdate = requests.find(
      ({ path }) => path === '/v1/blocks/code-block',
    );
    assert.equal(blockUpdate.method, 'PATCH');
    assert.equal(blockUpdate.body.code.language, 'python');
    assert.equal(blockUpdate.body.code.rich_text[0].text.content, 'print(2)');

    const pageUpdate = requests.find(
      ({ path }) => path === '/v1/pages/page-id',
    );
    assert.deepEqual(Object.keys(pageUpdate.body.properties), ['Date', 'mime']);
    assert.equal(
      requests.some(
        ({ method, path }) => method === 'POST' && path === '/v1/pages',
      ),
      false,
    );
  });

  it('adds the source code again if the code block was removed', async () => {
    const requests = mockNotion({
      existingPage: { id: 'page-id', url: PAGE_URL },
      blocks: [],
    });

    await upload(payload, problemInfo);

    const append = requests.find(
      ({ method, path }) =>
        method === 'PATCH' && path === '/v1/blocks/page-id/children',
    );
    assert.deepEqual(
      append.body.children.map(({ type }) => type),
      ['heading_1', 'code'],
    );
  });

  describe('when creating the page times out', () => {
    /**
     * Mocks Notion: the problem is not found, creating the page times out,
     * and the database is queried again after the timeout.
     * @param {?Object} pageAfterTimeout - The page found by the second query.
     * @param {Object[]} [blocks=[]] - The child blocks of that page.
     */
    const mockTimedOutCreate = (pageAfterTimeout, blocks = []) => {
      let queries = 0;
      globalThis.fetch = mock.fn(async (url, { method }) => {
        const { pathname } = new URL(url);

        if (method === 'POST' && pathname === '/v1/pages') {
          throw new DOMException('The operation was aborted.', 'AbortError');
        }
        if (pathname.endsWith('/query')) {
          queries += 1;
          const page = queries === 1 ? null : pageAfterTimeout;
          return jsonResponse({ results: page ? [page] : [] });
        }
        return jsonResponse({ results: blocks, has_more: false });
      });
    };

    it('reports the page if Notion created it before the timeout', async () => {
      mockTimedOutCreate({ id: 'page-id', url: PAGE_URL }, [
        codeBlock('print(2)'),
      ]);

      assert.equal(await upload(payload, problemInfo), PAGE_URL);
    });

    it('reports the timeout if the page was not created', async () => {
      mockTimedOutCreate(null);

      await assert.rejects(upload(payload, problemInfo), {
        name: 'TimeoutException',
        mayBeApplied: true,
      });
    });

    it('reports the timeout if the page has other source code', async () => {
      mockTimedOutCreate({ id: 'page-id', url: PAGE_URL }, [
        codeBlock('print(1)'),
      ]);

      await assert.rejects(upload(payload, problemInfo), {
        name: 'TimeoutException',
      });
    });
  });
});
