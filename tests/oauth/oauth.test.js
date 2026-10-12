import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { dispatch as githubDispatch } from '../../scripts/github/index.js';
import { dispatch as notionDispatch } from '../../scripts/notion/index.js';
import { dispatch as oauthDispatch } from '../../scripts/oauth/index.js';
import { openOAuthPage } from '../../scripts/oauth/state.js';
import {
  mockChromeSessionAndTabs,
  mockChromeStorage,
} from '../helpers/chrome.js';

const getState = (tab) => new URL(tab.url).searchParams.get('state');

const complete = (payload, tabId) =>
  oauthDispatch('complete', payload, { tab: { id: tabId } });

const openNotionPage = () =>
  openOAuthPage(
    'notion',
    (state) => `https://api.notion.com/v1/oauth/authorize?state=${state}`,
  );

// The token exchange fails in the tests (with SetupRequiredException if the token proxy URL
// is not set, or with the mocked fetch if it is), so a redirect that passes the state check
// rejects with anything but the state error. The Notion login itself is tested in
// tests/notion/auth.test.js.
const PASSED_STATE_CHECK = (error) => error.name !== 'InvalidRequestException';
const REJECTED_STATE = { name: 'InvalidRequestException' };

describe('OAuth redirect', () => {
  let tabs;

  beforeEach(() => {
    mockChromeStorage();
    tabs = mockChromeSessionAndTabs();
    globalThis.fetch = mock.fn();
    mock.method(console, 'debug', () => {});
  });

  afterEach(() => {
    mock.restoreAll();
    delete globalThis.chrome;
  });

  it('creates a random state for each login', async () => {
    await openNotionPage();
    await openNotionPage();

    const [first, second] = tabs.createdTabs;
    assert.match(getState(first), /^[0-9a-f-]{36}$/);
    assert.notEqual(getState(first), getState(second));
  });

  it('accepts the state from the tab opened for it, and closes that tab', async () => {
    await openNotionPage();
    const [tab] = tabs.createdTabs;

    await assert.rejects(
      complete({ code: 'code', state: getState(tab) }, tab.id),
      PASSED_STATE_CHECK,
    );
    assert.deepEqual(tabs.removedTabIds, [tab.id]);
  });

  it('rejects an unknown state without closing the tab', async () => {
    await assert.rejects(
      complete({ code: 'code', state: 'unknown' }, 1),
      REJECTED_STATE,
    );

    assert.equal(globalThis.fetch.mock.callCount(), 0);
    assert.deepEqual(tabs.removedTabIds, []);
  });

  it('rejects a redirect without a state', async () => {
    await openNotionPage();

    await assert.rejects(
      complete({ code: 'code' }, tabs.createdTabs[0].id),
      REJECTED_STATE,
    );
  });

  it('accepts a state only once', async () => {
    await openNotionPage();
    const [tab] = tabs.createdTabs;
    await assert.rejects(
      complete({ code: 'code', state: getState(tab) }, tab.id),
      PASSED_STATE_CHECK,
    );

    await assert.rejects(
      complete({ code: 'other-code', state: getState(tab) }, tab.id),
      REJECTED_STATE,
    );
  });

  it('rejects a state from another tab', async () => {
    await openNotionPage();
    const [tab] = tabs.createdTabs;

    await assert.rejects(
      complete({ code: 'code', state: getState(tab) }, tab.id + 1),
      REJECTED_STATE,
    );
    assert.deepEqual(tabs.removedTabIds, []);
  });

  it('rejects an expired state', async () => {
    const now = Date.now();
    mock.method(Date, 'now', () => now);
    await openNotionPage();
    const [tab] = tabs.createdTabs;

    Date.now.mock.mockImplementation(() => now + 10 * 60 * 1000);

    await assert.rejects(
      complete({ code: 'code', state: getState(tab) }, tab.id),
      REJECTED_STATE,
    );
  });

  it('does not log in through the platform dispatchers', async () => {
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
