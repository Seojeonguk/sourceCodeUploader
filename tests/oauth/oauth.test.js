import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { dispatch as githubDispatch } from '../../scripts/github/index.js';
import { dispatch as notionDispatch } from '../../scripts/notion/index.js';
import { dispatch as oauthDispatch } from '../../scripts/oauth/index.js';
import {
  jsonResponse,
  mockChromeSessionAndTabs,
  mockChromeStorage,
} from '../helpers/chrome.js';

const getState = (tab) => new URL(tab.url).searchParams.get('state');

const complete = (payload, tabId) =>
  oauthDispatch('complete', payload, { tab: { id: tabId } });

// Answers the GitHub and Notion token endpoints, and the GitHub user API.
const mockOAuthApis = () => {
  globalThis.fetch = mock.fn(async (url) => {
    const { hostname, pathname } = new URL(url);
    if (hostname === 'github.com' && pathname === '/login/oauth/access_token') {
      return new Response('access_token=github-token&scope=repo');
    }
    if (pathname === '/user') {
      return jsonResponse({ login: 'user' });
    }
    if (pathname === '/v1/oauth/token') {
      return jsonResponse({ access_token: 'notion-token' });
    }
    return jsonResponse({ message: 'Not Found' }, 404);
  });
};

const calledPaths = () =>
  globalThis.fetch.mock.calls.map(
    ({ arguments: [url] }) => new URL(url).pathname,
  );

describe('OAuth', () => {
  let storage;
  let tabs;

  beforeEach(() => {
    storage = mockChromeStorage();
    tabs = mockChromeSessionAndTabs();
    mockOAuthApis();
    mock.method(console, 'debug', () => {});
  });

  afterEach(() => {
    mock.restoreAll();
    delete globalThis.chrome;
  });

  it('sends a random state with the GitHub authorization request', async () => {
    await githubDispatch('openOauthPage');
    await githubDispatch('openOauthPage');

    const [first, second] = tabs.createdTabs;
    const params = new URL(first.url).searchParams;
    assert.equal(params.get('redirect_uri'), 'https://github.com');
    assert.match(getState(first), /^[0-9a-f-]{36}$/);
    assert.notEqual(getState(first), getState(second));
  });

  it('logs in to GitHub from the tab opened for it', async () => {
    await githubDispatch('openOauthPage');
    const [tab] = tabs.createdTabs;

    await complete({ code: 'code', state: getState(tab) }, tab.id);

    assert.equal(storage.githubAccessToken, 'github-token');
    assert.equal(storage.githubID, 'user');
    assert.deepEqual(tabs.removedTabIds, [tab.id]);
  });

  it('logs in to Notion: the platform comes from the state', async () => {
    await notionDispatch('openOauthPage');
    const [tab] = tabs.createdTabs;
    assert.equal(new URL(tab.url).searchParams.get('owner'), 'user');

    await complete({ code: 'code', state: getState(tab) }, tab.id);

    assert.deepEqual(calledPaths(), ['/v1/oauth/token']);
    assert.equal(storage.notionAccessToken, 'notion-token');
    assert.deepEqual(tabs.removedTabIds, [tab.id]);
  });

  it('rejects an unknown state without logging in or closing the tab', async () => {
    await assert.rejects(complete({ code: 'code', state: 'unknown' }, 1), {
      name: 'InvalidRequestException',
    });

    assert.equal(globalThis.fetch.mock.callCount(), 0);
    assert.deepEqual(tabs.removedTabIds, []);
    assert.deepEqual(storage, {});
  });

  it('rejects a redirect without a state', async () => {
    await githubDispatch('openOauthPage');

    await assert.rejects(complete({ code: 'code' }, tabs.createdTabs[0].id), {
      name: 'InvalidRequestException',
    });
    assert.equal(globalThis.fetch.mock.callCount(), 0);
  });

  it('accepts a state only once', async () => {
    await githubDispatch('openOauthPage');
    const [tab] = tabs.createdTabs;
    await complete({ code: 'code', state: getState(tab) }, tab.id);

    await assert.rejects(
      complete({ code: 'other-code', state: getState(tab) }, tab.id),
      { name: 'InvalidRequestException' },
    );
  });

  it('rejects a state from another tab', async () => {
    await githubDispatch('openOauthPage');
    const [tab] = tabs.createdTabs;

    await assert.rejects(
      complete({ code: 'code', state: getState(tab) }, tab.id + 1),
      { name: 'InvalidRequestException' },
    );
    assert.equal(globalThis.fetch.mock.callCount(), 0);
    assert.deepEqual(tabs.removedTabIds, []);
  });

  it('rejects an expired state', async () => {
    const now = Date.now();
    mock.method(Date, 'now', () => now);
    await githubDispatch('openOauthPage');
    const [tab] = tabs.createdTabs;

    Date.now.mock.mockImplementation(() => now + 10 * 60 * 1000);

    await assert.rejects(
      complete({ code: 'code', state: getState(tab) }, tab.id),
      { name: 'InvalidRequestException' },
    );
    assert.equal(globalThis.fetch.mock.callCount(), 0);
  });

  it('closes the login tab even if the token exchange fails', async () => {
    globalThis.fetch = mock.fn(async () => new Response('error=bad_code'));
    await githubDispatch('openOauthPage');
    const [tab] = tabs.createdTabs;

    await assert.rejects(
      complete({ code: 'bad', state: getState(tab) }, tab.id),
      {
        name: 'NotFoundException',
      },
    );
    assert.deepEqual(tabs.removedTabIds, [tab.id]);
    assert.equal(storage.githubAccessToken, undefined);
  });

  it('does not log in through the platform dispatchers anymore', async () => {
    await assert.rejects(
      githubDispatch('requestAndSaveAccessToken', { code: 'code' }),
      { message: 'Unsupported action : requestAndSaveAccessToken' },
    );
    await assert.rejects(
      notionDispatch('requestAndSaveAccessToken', { code: 'code' }),
      { message: 'Unsupported action : requestAndSaveAccessToken' },
    );
  });
});
