import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  backfill,
  createGitHubClient,
  createNotionClient,
  main,
  syncEvent,
  toIssueRow,
  toNotionProperties,
  toPullRow,
  toReleaseRow,
} from '../../tools/notion-sync.js';

const REPO = 'Seojeonguk/sourceCodeUploader';
const DATA_SOURCE_ID = 'data-source';

const issue = (fields = {}) => ({
  number: 7,
  title: 'Sync issues',
  state: 'open',
  state_reason: null,
  labels: [{ name: 'enhancement' }],
  milestone: { title: 'v4.0.0' },
  assignees: [{ login: 'Seojeonguk' }],
  user: { login: 'Seojeonguk' },
  html_url: `https://github.com/${REPO}/issues/7`,
  created_at: '2026-10-26T01:00:00Z',
  closed_at: null,
  ...fields,
});

const pull = (fields = {}) => ({
  ...issue({ html_url: `https://github.com/${REPO}/pull/8`, number: 8 }),
  draft: false,
  merged_at: null,
  ...fields,
});

const release = (fields = {}) => ({
  id: 99,
  name: 'v3.5.0',
  tag_name: 'v3.5.0',
  draft: false,
  prerelease: false,
  author: { login: 'Seojeonguk' },
  html_url: `https://github.com/${REPO}/releases/tag/v3.5.0`,
  created_at: '2026-10-20T01:00:00Z',
  published_at: '2026-10-20T02:00:00Z',
  ...fields,
});

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

/**
 * A fetch that answers from the routes in order of registration and records each call.
 * @param {[string, Function][]} routes - `METHOD url-prefix` and a handler returning a Response.
 */
const fakeFetch = (routes) => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const method = init.method ?? 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method, url, body, headers: init.headers });
    const route = routes.find(([key]) => {
      const [routeMethod, prefix] = key.split(' ');
      return routeMethod === method && url.startsWith(prefix);
    });
    if (!route) throw new Error(`Unexpected request ${method} ${url}`);
    return route[1]({ url, body });
  };
  return { fetchImpl, calls };
};

const noWait = async () => {};

describe('rows', () => {
  it('maps an open issue', () => {
    assert.deepEqual(toIssueRow(issue()), {
      type: 'Issue',
      name: 'Sync issues',
      number: 7,
      state: 'Open',
      labels: ['enhancement'],
      milestone: 'v4.0.0',
      assignees: ['Seojeonguk'],
      author: 'Seojeonguk',
      url: `https://github.com/${REPO}/issues/7`,
      created: '2026-10-26T01:00:00Z',
      closed: null,
    });
  });

  it('tells closed issues from not planned ones', () => {
    const closedAt = '2026-10-27T00:00:00Z';
    assert.equal(
      toIssueRow(
        issue({
          state: 'closed',
          state_reason: 'completed',
          closed_at: closedAt,
        }),
      ).state,
      'Closed',
    );
    const notPlanned = toIssueRow(
      issue({
        state: 'closed',
        state_reason: 'not_planned',
        closed_at: closedAt,
      }),
    );
    assert.equal(notPlanned.state, 'Not planned');
    assert.equal(notPlanned.closed, closedAt);
  });

  it('maps pull requests as open, draft, merged or closed', () => {
    assert.equal(toPullRow(pull()).state, 'Open');
    assert.equal(toPullRow(pull()).type, 'PR');
    assert.equal(toPullRow(pull({ draft: true })).state, 'Draft');

    const mergedAt = '2026-10-27T00:00:00Z';
    const merged = toPullRow(
      pull({ state: 'closed', merged_at: mergedAt, closed_at: mergedAt }),
    );
    assert.equal(merged.state, 'Merged');
    assert.equal(merged.closed, mergedAt);
    assert.equal(
      toPullRow(pull({ state: 'closed', closed_at: mergedAt })).state,
      'Closed',
    );
  });

  it('maps releases, using the tag when there is no name', () => {
    const row = toReleaseRow(release({ name: '' }));
    assert.equal(row.type, 'Release');
    assert.equal(row.name, 'v3.5.0');
    assert.equal(row.number, null);
    assert.equal(row.state, 'Published');
    assert.equal(row.closed, '2026-10-20T02:00:00Z');
    assert.equal(
      toReleaseRow(release({ prerelease: true })).state,
      'Pre-release',
    );
  });

  it('turns a row into Notion properties', () => {
    const properties = toNotionProperties(
      toIssueRow(issue({ labels: [{ name: 'a, b' }], milestone: null })),
    );
    assert.deepEqual(properties.Name, {
      title: [{ type: 'text', text: { content: 'Sync issues' } }],
    });
    assert.deepEqual(properties.Type, { select: { name: 'Issue' } });
    assert.deepEqual(properties.Number, { number: 7 });
    // Notion rejects commas in select options.
    assert.deepEqual(properties.Labels, { multi_select: [{ name: 'a b' }] });
    assert.deepEqual(properties.Milestone, { select: null });
    assert.deepEqual(properties.Assignees, {
      rich_text: [{ type: 'text', text: { content: 'Seojeonguk' } }],
    });
    assert.deepEqual(properties.URL, {
      url: `https://github.com/${REPO}/issues/7`,
    });
    assert.deepEqual(properties.Created, {
      date: { start: '2026-10-26T01:00:00Z' },
    });
    assert.deepEqual(properties.Closed, { date: null });
  });

  it('leaves the text empty when there are no assignees', () => {
    const properties = toNotionProperties(toIssueRow(issue({ assignees: [] })));
    assert.deepEqual(properties.Assignees, { rich_text: [] });
  });
});

describe('createNotionClient', () => {
  it('sends the token and the API version', async () => {
    const { fetchImpl, calls } = fakeFetch([
      ['POST https://api.notion.com/v1/pages', () => json(200, { id: 'p' })],
    ]);
    const notion = createNotionClient({ token: 'secret', fetchImpl });

    await notion.createPage(DATA_SOURCE_ID, { Name: {} });

    assert.equal(calls[0].headers.Authorization, 'Bearer secret');
    assert.equal(calls[0].headers['Notion-Version'], '2026-03-11');
    assert.deepEqual(calls[0].body, {
      parent: { type: 'data_source_id', data_source_id: DATA_SOURCE_ID },
      properties: { Name: {} },
    });
  });

  it('waits and retries when rate limited', async () => {
    let attempts = 0;
    const waits = [];
    const { fetchImpl } = fakeFetch([
      [
        'PATCH https://api.notion.com/v1/pages/p',
        () => {
          attempts += 1;
          return attempts === 1
            ? json(429, { message: 'slow down' }, { 'Retry-After': '3' })
            : json(200, { id: 'p' });
        },
      ],
    ]);
    const notion = createNotionClient({
      token: 't',
      fetchImpl,
      wait: async (ms) => waits.push(ms),
    });

    await notion.updatePage('p', {});

    assert.equal(attempts, 2);
    assert.deepEqual(waits, [3000]);
  });

  it('throws with the Notion message on other errors', async () => {
    const { fetchImpl } = fakeFetch([
      [
        'PATCH https://api.notion.com/v1/pages/p',
        () => json(400, { message: 'Labels is not a property' }),
      ],
    ]);
    const notion = createNotionClient({ token: 't', fetchImpl, wait: noWait });

    await assert.rejects(
      notion.updatePage('p', {}),
      /400: Labels is not a property/,
    );
  });

  it('lists every page of the data source by URL', async () => {
    const page = (id, url) => ({ id, properties: { URL: { url } } });
    const { fetchImpl, calls } = fakeFetch([
      [
        `POST https://api.notion.com/v1/data_sources/${DATA_SOURCE_ID}/query`,
        ({ body }) =>
          body.start_cursor
            ? json(200, { results: [page('b', 'u2')], has_more: false })
            : json(200, {
                results: [page('a', 'u1'), page('x', null)],
                has_more: true,
                next_cursor: 'c1',
              }),
      ],
    ]);
    const notion = createNotionClient({ token: 't', fetchImpl });

    const pages = await notion.listPages(DATA_SOURCE_ID);

    assert.deepEqual(
      [...pages],
      [
        ['u1', 'a'],
        ['u2', 'b'],
      ],
    );
    assert.equal(calls[1].body.start_cursor, 'c1');
  });
});

describe('createGitHubClient', () => {
  it('follows the next links and drops pull requests from the issues', async () => {
    const base = `https://api.github.com/repos/${REPO}`;
    const { fetchImpl, calls } = fakeFetch([
      [
        `GET ${base}/issues?state=all&per_page=100&page=2`,
        () => json(200, [issue({ number: 2 })]),
      ],
      [
        `GET ${base}/issues`,
        () =>
          json(200, [issue({ number: 1 }), { ...issue(), pull_request: {} }], {
            Link: `<${base}/issues?state=all&per_page=100&page=2>; rel="next", <${base}/issues?state=all&per_page=100&page=2>; rel="last"`,
          }),
      ],
    ]);
    const github = createGitHubClient({
      token: 'gh',
      repository: REPO,
      fetchImpl,
    });

    const issues = await github.listIssues();

    assert.deepEqual(
      issues.map(({ number }) => number),
      [1, 2],
    );
    assert.equal(calls[0].headers.Authorization, 'Bearer gh');
  });

  it('leaves out draft releases', async () => {
    const { fetchImpl } = fakeFetch([
      [
        `GET https://api.github.com/repos/${REPO}/releases`,
        () => json(200, [release(), release({ id: 100, draft: true })]),
      ],
    ]);
    const github = createGitHubClient({
      token: 'gh',
      repository: REPO,
      fetchImpl,
    });

    const releases = await github.listReleases();

    assert.deepEqual(
      releases.map(({ id }) => id),
      [99],
    );
  });
});

/** A Notion client that keeps the pages in a map, as the database would. */
const fakeNotion = (pages = new Map()) => {
  const log = [];
  let nextId = 0;
  const urlOf = (properties) => properties.URL.url;
  return {
    log,
    pages,
    findPage: async (dataSourceId, url) =>
      pages.has(url) ? { id: pages.get(url) } : null,
    listPages: async () => new Map(pages),
    createPage: async (dataSourceId, properties) => {
      nextId += 1;
      pages.set(urlOf(properties), `new-${nextId}`);
      log.push(['create', urlOf(properties), properties]);
    },
    updatePage: async (pageId, properties) => {
      log.push(['update', pageId, properties]);
    },
    trashPage: async (pageId) => {
      log.push(['trash', pageId]);
    },
  };
};

const fakeGitHub = ({ issues = [], pulls = [], releases = [] } = {}) => ({
  getIssue: async (number) => issues.find((item) => item.number === number),
  getPull: async (number) => pulls.find((item) => item.number === number),
  getRelease: async (id) => releases.find((item) => item.id === id),
  listIssues: async () => issues,
  listPulls: async () => pulls,
  listReleases: async () => releases,
});

describe('syncEvent', () => {
  it('creates a row for a new issue from its current state', async () => {
    const notion = fakeNotion();
    // The event payload is older than the issue, which has a label now.
    const current = issue({ labels: [{ name: 'bug' }] });
    await syncEvent({
      eventName: 'issues',
      payload: { action: 'opened', issue: issue({ labels: [] }) },
      github: fakeGitHub({ issues: [current] }),
      notion,
      dataSourceId: DATA_SOURCE_ID,
    });

    assert.equal(notion.log.length, 1);
    const [action, url, properties] = notion.log[0];
    assert.equal(action, 'create');
    assert.equal(url, current.html_url);
    assert.deepEqual(properties.Labels, { multi_select: [{ name: 'bug' }] });
  });

  it('updates the row of a pull request that is already there', async () => {
    const merged = pull({
      state: 'closed',
      merged_at: '2026-10-27T00:00:00Z',
      closed_at: '2026-10-27T00:00:00Z',
    });
    const notion = fakeNotion(new Map([[merged.html_url, 'page-8']]));
    await syncEvent({
      eventName: 'pull_request_target',
      payload: { action: 'closed', pull_request: pull() },
      github: fakeGitHub({ pulls: [merged] }),
      notion,
      dataSourceId: DATA_SOURCE_ID,
    });

    assert.equal(notion.log.length, 1);
    const [action, pageId, properties] = notion.log[0];
    assert.equal(action, 'update');
    assert.equal(pageId, 'page-8');
    assert.deepEqual(properties.State, { select: { name: 'Merged' } });
  });

  it('syncs a published release', async () => {
    const notion = fakeNotion();
    await syncEvent({
      eventName: 'release',
      payload: { action: 'published', release: release() },
      github: fakeGitHub({ releases: [release()] }),
      notion,
      dataSourceId: DATA_SOURCE_ID,
    });

    assert.equal(notion.log[0][0], 'create');
    assert.deepEqual(notion.log[0][2].Type, { select: { name: 'Release' } });
  });

  it('moves the row of a deleted issue or release to the trash', async () => {
    const notion = fakeNotion(
      new Map([
        [issue().html_url, 'page-7'],
        [release().html_url, 'page-r'],
      ]),
    );
    const github = fakeGitHub();
    await syncEvent({
      eventName: 'issues',
      payload: { action: 'deleted', issue: issue() },
      github,
      notion,
      dataSourceId: DATA_SOURCE_ID,
    });
    await syncEvent({
      eventName: 'release',
      payload: { action: 'deleted', release: release() },
      github,
      notion,
      dataSourceId: DATA_SOURCE_ID,
    });

    assert.deepEqual(notion.log, [
      ['trash', 'page-7'],
      ['trash', 'page-r'],
    ]);
  });

  it('does nothing for a deleted item that has no row', async () => {
    const notion = fakeNotion();
    await syncEvent({
      eventName: 'issues',
      payload: { action: 'deleted', issue: issue() },
      github: fakeGitHub(),
      notion,
      dataSourceId: DATA_SOURCE_ID,
    });

    assert.deepEqual(notion.log, []);
  });

  it('skips a release that is a draft again', async () => {
    const notion = fakeNotion();
    await syncEvent({
      eventName: 'release',
      payload: { action: 'edited', release: release() },
      github: fakeGitHub({ releases: [release({ draft: true })] }),
      notion,
      dataSourceId: DATA_SOURCE_ID,
    });

    assert.deepEqual(notion.log, []);
  });
});

describe('backfill', () => {
  it('creates the missing rows and updates the others', async () => {
    const notion = fakeNotion(new Map([[issue().html_url, 'page-7']]));
    const counts = await backfill({
      github: fakeGitHub({
        issues: [issue()],
        pulls: [pull()],
        releases: [release()],
      }),
      notion,
      dataSourceId: DATA_SOURCE_ID,
    });

    assert.deepEqual(counts, { created: 2, updated: 1 });
    assert.deepEqual(
      notion.log.map(([action, target]) => [action, target]),
      [
        ['update', 'page-7'],
        ['create', pull().html_url],
        ['create', release().html_url],
      ],
    );
  });
});

describe('main', () => {
  it('skips with a notice when the Notion secrets are missing', async () => {
    const lines = [];
    const ran = await main({ GITHUB_EVENT_NAME: 'issues' }, (line) =>
      lines.push(line),
    );

    assert.equal(ran, false);
    assert.match(lines[0], /^::notice::/);
  });
});
