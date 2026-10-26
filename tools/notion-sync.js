/**
 * Keeps a Notion database of the repository's issues, pull requests and releases, one row
 * per item found by its URL. Notion's GitHub synced databases need the Business plan, while
 * the Notion API works on every plan. See .github/workflows/notion-sync.yml.
 *
 * On an `issues`, `pull_request(_target)` or `release` event it writes the item as it is now,
 * read again from the GitHub API, so a late run never writes an older state. On
 * `workflow_dispatch` it writes every item.
 *
 * Environment: NOTION_TOKEN (the API token of an internal connection added to the database),
 * NOTION_DATA_SOURCE_ID, and the GITHUB_* variables of GitHub Actions.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const NOTION_API = 'https://api.notion.com';
// The same version as the extension (scripts/notion/config/config.js).
const NOTION_VERSION = '2026-03-11';
const GITHUB_API = 'https://api.github.com';
const RETRIES = 3;
// Notion limits each rich text object and select option name.
const TEXT_LIMIT = 2000;
const SELECT_LIMIT = 100;

/**
 * @typedef {Object} Row
 * @property {'Issue'|'PR'|'Release'} type
 * @property {string} name
 * @property {?number} number
 * @property {string} state
 * @property {string[]} labels
 * @property {?string} milestone
 * @property {string[]} assignees
 * @property {string} author
 * @property {string} url
 * @property {string} created
 * @property {?string} closed - When the item was closed, merged or published.
 */

const issueFields = (item) => ({
  name: item.title,
  number: item.number,
  labels: item.labels.map(({ name }) => name),
  milestone: item.milestone?.title ?? null,
  assignees: item.assignees.map(({ login }) => login),
  author: item.user.login,
  url: item.html_url,
  created: item.created_at,
  closed: item.closed_at,
});

const issueState = (item) => {
  if (item.state === 'open') return 'Open';
  return item.state_reason === 'not_planned' ? 'Not planned' : 'Closed';
};

const pullState = (item) => {
  if (item.merged_at) return 'Merged';
  if (item.state !== 'open') return 'Closed';
  return item.draft ? 'Draft' : 'Open';
};

/** @returns {Row} The row of a GitHub issue. */
export const toIssueRow = (item) => ({
  type: 'Issue',
  ...issueFields(item),
  state: issueState(item),
});

/** @returns {Row} The row of a GitHub pull request. */
export const toPullRow = (item) => ({
  type: 'PR',
  ...issueFields(item),
  state: pullState(item),
  closed: item.merged_at ?? item.closed_at,
});

/** @returns {Row} The row of a published GitHub release. */
export const toReleaseRow = (item) => ({
  type: 'Release',
  name: item.name || item.tag_name,
  number: null,
  state: item.prerelease ? 'Pre-release' : 'Published',
  labels: [],
  milestone: null,
  assignees: [],
  author: item.author.login,
  url: item.html_url,
  created: item.created_at,
  closed: item.published_at,
});

const text = (content) =>
  content
    ? [{ type: 'text', text: { content: content.slice(0, TEXT_LIMIT) } }]
    : [];

// Notion rejects commas in select options.
const option = (name) => ({
  name: name.replaceAll(',', ' ').replace(/\s+/g, ' ').slice(0, SELECT_LIMIT),
});

/**
 * Returns the properties of a row in the database.
 * @param {Row} row
 * @returns {Object} Notion page properties.
 */
export const toNotionProperties = (row) => ({
  Name: { title: text(row.name) },
  Type: { select: { name: row.type } },
  Number: { number: row.number },
  State: { select: { name: row.state } },
  Labels: { multi_select: row.labels.map(option) },
  Milestone: { select: row.milestone ? option(row.milestone) : null },
  Assignees: { rich_text: text(row.assignees.join(', ')) },
  Author: { rich_text: text(row.author) },
  URL: { url: row.url },
  Created: { date: { start: row.created } },
  Closed: { date: row.closed ? { start: row.closed } : null },
});

/**
 * Creates a client for the Notion API that waits and retries when rate limited or on a
 * server error.
 * @param {{token: string, fetchImpl?: typeof fetch, wait?: (ms: number) => Promise}} options
 */
export const createNotionClient = ({
  token,
  fetchImpl = fetch,
  wait = sleep,
}) => {
  const request = async (path, method, body, attempt = 0) => {
    const response = await fetchImpl(`${NOTION_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_VERSION,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (
      (response.status === 429 || response.status >= 500) &&
      attempt < RETRIES
    ) {
      const seconds =
        Number(response.headers.get('Retry-After')) || 2 ** attempt;
      await wait(seconds * 1000);
      return request(path, method, body, attempt + 1);
    }
    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `Notion ${method} ${path} failed with ${response.status}: ${data.message}`,
      );
    }
    return data;
  };

  const query = (dataSourceId, body) =>
    request(`/v1/data_sources/${dataSourceId}/query`, 'POST', body);

  return {
    /** @returns {Promise<?Object>} The page whose URL property is `url`. */
    findPage: async (dataSourceId, url) => {
      const { results } = await query(dataSourceId, {
        filter: { property: 'URL', url: { equals: url } },
        page_size: 1,
      });
      return results[0] ?? null;
    },

    /** @returns {Promise<Map<string, string>>} The page IDs by their URL property. */
    listPages: async (dataSourceId) => {
      const pages = new Map();
      let cursor;
      do {
        // eslint-disable-next-line no-await-in-loop -- each page needs the previous cursor
        const data = await query(dataSourceId, {
          page_size: 100,
          ...(cursor && { start_cursor: cursor }),
        });
        data.results.forEach((page) => {
          const url = page.properties.URL?.url;
          if (url) pages.set(url, page.id);
        });
        cursor = data.has_more ? data.next_cursor : null;
      } while (cursor);
      return pages;
    },

    createPage: (dataSourceId, properties) =>
      request('/v1/pages', 'POST', {
        parent: { type: 'data_source_id', data_source_id: dataSourceId },
        properties,
      }),

    updatePage: (pageId, properties) =>
      request(`/v1/pages/${pageId}`, 'PATCH', { properties }),

    trashPage: (pageId) =>
      request(`/v1/pages/${pageId}`, 'PATCH', { in_trash: true }),
  };
};

const nextLink = (header) =>
  header?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;

/**
 * Creates a client for the GitHub REST API of one repository.
 * @param {{token: string, repository: string, fetchImpl?: typeof fetch}} options
 */
export const createGitHubClient = ({
  token,
  repository,
  fetchImpl = fetch,
}) => {
  const request = async (url) => {
    const response = await fetchImpl(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!response.ok) {
      throw new Error(`GitHub GET ${url} failed with ${response.status}`);
    }
    return {
      data: await response.json(),
      next: nextLink(response.headers.get('Link')),
    };
  };

  const get = async (path) =>
    (await request(`${GITHUB_API}/repos/${repository}${path}`)).data;

  const getAll = async (path) => {
    const items = [];
    let url = `${GITHUB_API}/repos/${repository}${path}`;
    while (url) {
      // eslint-disable-next-line no-await-in-loop -- each page has the link to the next
      const { data, next } = await request(url);
      items.push(...data);
      url = next;
    }
    return items;
  };

  return {
    getIssue: (number) => get(`/issues/${number}`),
    getPull: (number) => get(`/pulls/${number}`),
    getRelease: (id) => get(`/releases/${id}`),
    // The issues endpoint also returns pull requests, which lack the merge state there.
    listIssues: async () =>
      (await getAll('/issues?state=all&per_page=100')).filter(
        (item) => !item.pull_request,
      ),
    listPulls: () => getAll('/pulls?state=all&per_page=100'),
    listReleases: async () =>
      (await getAll('/releases?per_page=100')).filter((item) => !item.draft),
  };
};

const writeRow = async (notion, dataSourceId, row, pageId) => {
  const properties = toNotionProperties(row);
  if (pageId) {
    await notion.updatePage(pageId, properties);
  } else {
    await notion.createPage(dataSourceId, properties);
  }
};

// The item of each event: its URL in the payload and its row as it is now.
const EVENT_ITEMS = {
  issues: {
    url: (payload) => payload.issue.html_url,
    load: async (github, payload) =>
      toIssueRow(await github.getIssue(payload.issue.number)),
  },
  pull_request: {
    url: (payload) => payload.pull_request.html_url,
    load: async (github, payload) =>
      toPullRow(await github.getPull(payload.pull_request.number)),
  },
  release: {
    url: (payload) => payload.release.html_url,
    load: async (github, payload) => {
      const item = await github.getRelease(payload.release.id);
      return item.draft ? null : toReleaseRow(item);
    },
  },
};
EVENT_ITEMS.pull_request_target = EVENT_ITEMS.pull_request;

/**
 * Writes the item of an event, or moves its row to the trash when the item was deleted.
 * @returns {Promise<string>} What happened, for the log.
 */
export const syncEvent = async ({
  eventName,
  payload,
  github,
  notion,
  dataSourceId,
}) => {
  const item = EVENT_ITEMS[eventName];
  if (!item) return `Skipped the ${eventName} event.`;

  const url = item.url(payload);
  const page = await notion.findPage(dataSourceId, url);
  if (payload.action === 'deleted') {
    if (!page) return `No row for ${url}.`;
    await notion.trashPage(page.id);
    return `Moved the row of ${url} to the trash.`;
  }

  const row = await item.load(github, payload);
  if (!row) return `Skipped the draft ${url}.`;
  await writeRow(notion, dataSourceId, row, page?.id);
  return `${page ? 'Updated' : 'Created'} the row of ${url}.`;
};

/**
 * Writes every issue, pull request and published release.
 * @returns {Promise<{created: number, updated: number}>}
 */
export const backfill = async ({ github, notion, dataSourceId }) => {
  const [issues, pulls, releases, pages] = await Promise.all([
    github.listIssues(),
    github.listPulls(),
    github.listReleases(),
    notion.listPages(dataSourceId),
  ]);
  const rows = [
    ...issues.map(toIssueRow),
    ...pulls.map(toPullRow),
    ...releases.map(toReleaseRow),
  ];

  const counts = { created: 0, updated: 0 };
  // eslint-disable-next-line no-restricted-syntax -- one request at a time for the rate limit
  for (const row of rows) {
    const pageId = pages.get(row.url);
    // eslint-disable-next-line no-await-in-loop -- one request at a time for the rate limit
    await writeRow(notion, dataSourceId, row, pageId);
    counts[pageId ? 'updated' : 'created'] += 1;
  }
  return counts;
};

/**
 * Runs the sync for the GitHub Actions environment.
 * @param {Object} env - The environment variables.
 * @param {(line: string) => void} log
 * @returns {Promise<boolean>} Whether it ran, which needs the Notion secrets.
 */
export const main = async (env, log) => {
  const { NOTION_TOKEN, NOTION_DATA_SOURCE_ID } = env;
  if (!NOTION_TOKEN || !NOTION_DATA_SOURCE_ID) {
    log(
      '::notice::Skipped the Notion sync: set the NOTION_TOKEN and NOTION_DATA_SOURCE_ID secrets.',
    );
    return false;
  }

  const notion = createNotionClient({ token: NOTION_TOKEN });
  const github = createGitHubClient({
    token: env.GITHUB_TOKEN,
    repository: env.GITHUB_REPOSITORY,
  });
  const dataSourceId = NOTION_DATA_SOURCE_ID;

  if (env.GITHUB_EVENT_NAME === 'workflow_dispatch') {
    const { created, updated } = await backfill({
      github,
      notion,
      dataSourceId,
    });
    log(`Created ${created} rows and updated ${updated} rows.`);
  } else {
    const payload = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
    log(
      await syncEvent({
        eventName: env.GITHUB_EVENT_NAME,
        payload,
        github,
        notion,
        dataSourceId,
      }),
    );
  }
  return true;
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  // eslint-disable-next-line no-console -- the log of the workflow
  await main(process.env, console.log);
}
