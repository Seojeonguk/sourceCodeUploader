import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import {
  getDataSources,
  upload,
} from '../../scripts/notion/services/databaseService.js';

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
 * @param {?Object} param.existingPage - The page returned by the data source query.
 * @param {Object[]} [param.blocks=[]] - The child blocks of the existing page.
 * @param {Object[]} [param.dataSources] - The data sources of the database `database-id`.
 * @returns {Object[]} The requests sent to the API, as `{ method, path, body, version }`.
 */
const mockNotion = ({
  existingPage,
  blocks = [],
  dataSources = [{ id: 'data-source-id', name: 'Problems' }],
}) => {
  const requests = [];

  globalThis.fetch = mock.fn(async (url, { method, body, headers }) => {
    const { pathname } = new URL(url);
    requests.push({
      method,
      path: pathname,
      body: body && JSON.parse(body),
      version: headers['Notion-Version'],
    });

    if (method === 'GET' && pathname === '/v1/databases/database-id') {
      return jsonResponse({ id: 'database-id', data_sources: dataSources });
    }
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
      local: {
        get: ([key], callback) => callback({ [key]: storage[key] }),
        set: async (values) => {
          Object.assign(storage, values);
        },
      },
    },
  };
  return storage;
};

describe('upload', () => {
  beforeEach(() => {
    mockStorage({
      notionAccessToken: 'token',
      notionUploadedDataSourceId: 'data-source-id',
    });
    mock.method(console, 'debug', () => {});
  });

  it('asks to log in without the access token', async () => {
    mockStorage({ notionUploadedDataSourceId: 'data-source-id' });
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
    assert.equal(requests[0].path, '/v1/data_sources/data-source-id/query');
    assert.deepEqual(requests[0].body.filter, {
      property: 'URL',
      url: { equals: problemInfo.url },
    });
    assert.equal(requests.at(-1).method, 'POST');
    assert.equal(requests.at(-1).path, '/v1/pages');
    assert.deepEqual(requests.at(-1).body.parent, {
      type: 'data_source_id',
      data_source_id: 'data-source-id',
    });
    assert.ok(requests.every(({ version }) => version === '2026-03-11'));
  });

  describe('a database selected before the data sources', () => {
    it('moves the selection to the data source of the database, once', async () => {
      const storage = mockStorage({
        notionAccessToken: 'token',
        notionUploadedDatabaseId: 'database-id',
      });
      const requests = mockNotion({ existingPage: null });

      await upload(payload, problemInfo);

      assert.equal(storage.notionUploadedDataSourceId, 'data-source-id');
      assert.equal(requests[0].method, 'GET');
      assert.equal(requests[0].path, '/v1/databases/database-id');
      assert.equal(requests[1].path, '/v1/data_sources/data-source-id/query');

      await upload(payload, problemInfo);
      assert.equal(
        requests.filter(({ path }) => path === '/v1/databases/database-id')
          .length,
        1,
      );
    });

    [
      ['more than one data source', [{ id: 'a' }, { id: 'b' }]],
      ['no data source', []],
    ].forEach(([name, dataSources]) => {
      it(`asks to select it again when the database has ${name}`, async () => {
        const storage = mockStorage({
          notionAccessToken: 'token',
          notionUploadedDatabaseId: 'database-id',
        });
        const requests = mockNotion({ existingPage: null, dataSources });

        await assert.rejects(upload(payload, problemInfo), {
          name: 'SetupRequiredException',
          message:
            'Select the Notion database again in the extension popup. The saved one could not be matched to a single data source.',
        });
        assert.equal(storage.notionUploadedDataSourceId, undefined);
        assert.deepEqual(
          requests.map(({ path }) => path),
          ['/v1/databases/database-id'],
        );
      });
    });
  });

  it('asks to select the database again when it is no longer shared', async () => {
    const storage = mockStorage({
      notionAccessToken: 'token',
      notionUploadedDatabaseId: 'database-id',
    });
    globalThis.fetch = mock.fn(
      async () =>
        new Response(
          JSON.stringify({
            object: 'error',
            status: 404,
            code: 'object_not_found',
            message: 'Could not find database with ID: database-id.',
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        ),
    );

    await assert.rejects(upload(payload, problemInfo), {
      name: 'SetupRequiredException',
      message:
        'Select the Notion database again in the extension popup. The saved one could not be matched to a single data source.',
    });
    assert.equal(storage.notionUploadedDataSourceId, undefined);
    assert.equal(globalThis.fetch.mock.callCount(), 1);
  });

  it('sends the query again after a server error, since it only reads', async () => {
    let queries = 0;
    const requests = [];
    globalThis.fetch = mock.fn(async (url, { method }) => {
      const { pathname } = new URL(url);
      requests.push(`${method} ${pathname}`);
      if (pathname.endsWith('/query')) {
        queries += 1;
        return queries === 1
          ? new Response('{}', {
              status: 502,
              headers: { 'Content-Type': 'application/json' },
            })
          : jsonResponse({ results: [] });
      }
      return jsonResponse({ url: 'https://www.notion.so/new-page' });
    });
    mock.method(console, 'warn', () => {});

    assert.equal(
      await upload(payload, problemInfo),
      'https://www.notion.so/new-page',
    );
    assert.deepEqual(requests, [
      'POST /v1/data_sources/data-source-id/query',
      'POST /v1/data_sources/data-source-id/query',
      'POST /v1/pages',
    ]);
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

describe('getDataSources', () => {
  beforeEach(() => {
    mockStorage({ notionAccessToken: 'token' });
    mock.method(console, 'debug', () => {});
  });

  afterEach(() => {
    mock.restoreAll();
    delete globalThis.chrome;
  });

  it('searches the data sources, following every page', async () => {
    const bodies = [];
    globalThis.fetch = mock.fn(async (url, { body }) => {
      const request = JSON.parse(body);
      bodies.push(request);
      return request.start_cursor
        ? jsonResponse({ results: [{ id: 'ds-2' }], has_more: false })
        : jsonResponse({
            results: [{ id: 'ds-1' }],
            has_more: true,
            next_cursor: 'cursor',
          });
    });

    const dataSources = await getDataSources();

    assert.deepEqual(
      dataSources.map(({ id }) => id),
      ['ds-1', 'ds-2'],
    );
    assert.deepEqual(bodies[0].filter, {
      value: 'data_source',
      property: 'object',
    });
    assert.equal(bodies[1].start_cursor, 'cursor');
  });
});
