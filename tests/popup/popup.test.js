import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { JSDOM, VirtualConsole } from 'jsdom';

import { initializeButtonEvents } from '../../popup/js/buttonEventHandler.js';
import { initializeOnLoad } from '../../popup/js/onLoadInitialization.js';
import { showToast } from '../../popup/js/toast.js';
import { GITHUB_CONFIG } from '../../scripts/github/config/config.js';

const POPUP_HTML = readFileSync(
  new URL('../../popup/html/index.html', import.meta.url),
  'utf8',
);
// Settles the pending promises of the handlers.
const flush = async () => {
  await new Promise(setImmediate);
  await new Promise(setImmediate);
};

/**
 * Loads the popup page into a DOM, like the browser does.
 */
const loadPopup = () => {
  const dom = new JSDOM(POPUP_HTML, {
    url: 'chrome-extension://mfhbpmbchemfhijjamldbkidlegfmaff/popup/html/index.html',
    // jsdom does not implement location.reload(), which logout calls.
    virtualConsole: new VirtualConsole(),
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
};

/**
 * Mocks the chrome APIs that the popup uses.
 * @param {Object} [options]
 * @param {Object} [options.storage] - The values in chrome.storage.local.
 * @param {Object} [options.responses] - The background responses, keyed by `platform/action`.
 * @returns {{ sent: Object[], createdTabs: Object[], storage: Object }}
 */
const mockChrome = ({ storage = {}, responses = {} } = {}) => {
  const sent = [];
  const createdTabs = [];

  globalThis.chrome = {
    runtime: {
      lastError: null,
      sendMessage: (message, callback) => {
        sent.push(message);
        const response = responses[`${message.platform}/${message.action}`];
        callback(response ?? { ok: true, message: null });
      },
    },
    storage: {
      local: {
        get: ([key], callback) => callback({ [key]: storage[key] }),
        set: async (values) => {
          Object.assign(storage, values);
        },
      },
    },
    tabs: { create: (properties) => createdTabs.push(properties) },
  };

  return { sent, createdTabs, storage };
};

const $$ = (selector) => document.querySelector(selector);
const toast = () => $$('.scu-toast');
const actionsOf = (sent) =>
  sent.map(({ platform, action }) => `${platform}/${action}`);

describe('popup', () => {
  beforeEach(() => {
    mock.method(console, 'debug', () => {});
    mock.method(console, 'error', () => {});
    // The toasts remove themselves after 4 seconds, which would keep the test process running.
    mock.timers.enable({ apis: ['setTimeout'] });
    loadPopup();
  });

  afterEach(() => {
    mock.timers.reset();
    mock.restoreAll();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.chrome;
  });

  describe('on load', () => {
    it('shows the platforms that are logged in, and their options', async () => {
      mockChrome({
        storage: {
          githubAccessToken: 'token',
          githubAutoUpload: true,
          githubUploadedRepository: 'solutions',
          notionUploadedDatabase: 'Problems',
        },
      });

      initializeOnLoad();
      await flush();

      assert.ok($$('.github .status').classList.contains('green'));
      assert.equal($$('#github-authentication').textContent, 'Remove');
      assert.ok($$('#github-authentication').classList.contains('delete'));
      assert.equal($$('#github-auto-upload').checked, true);
      assert.equal($$('#uploaded-repository').textContent, 'solutions');

      assert.ok(!$$('.notion .status').classList.contains('green'));
      assert.equal(
        $$('#notion-authentication').textContent.trim(),
        'Authorize',
      );
      assert.ok(!$$('#notion-authentication').classList.contains('delete'));
      assert.equal($$('#notion-auto-upload').checked, false);
      assert.equal($$('#uploaded-database').textContent, 'Problems');
    });

    it('shows why the last Notion login failed', async () => {
      const { sent } = mockChrome({
        responses: {
          'notion/takeLoginError': {
            ok: true,
            message: 'Access to Notion was not allowed.',
          },
        },
      });

      initializeOnLoad();
      await flush();

      assert.ok(actionsOf(sent).includes('notion/takeLoginError'));
      assert.equal(toast().textContent, 'Access to Notion was not allowed.');
      assert.ok(toast().classList.contains('scu-toast-error'));
    });

    it('shows no message when the last login did not fail', async () => {
      mockChrome();

      initializeOnLoad();
      await flush();

      assert.equal(toast(), null);
    });
  });

  describe('authentication', () => {
    it('opens the login page with Authorize', async () => {
      const { sent } = mockChrome();
      initializeButtonEvents();

      $$('#github-authentication').click();
      await flush();

      assert.deepEqual(actionsOf(sent), ['github/openOauthPage']);
      assert.equal(toast(), null);
    });

    it('shows why the Notion login failed while the popup is open, only once', async () => {
      const { sent } = mockChrome({
        responses: {
          'notion/openOauthPage': {
            ok: false,
            message: 'Access to Notion was not allowed.',
          },
        },
      });
      initializeButtonEvents();

      $$('#notion-authentication').click();
      await flush();

      assert.equal(toast().textContent, 'Access to Notion was not allowed.');
      // Taken, so the next popup does not show it again.
      assert.deepEqual(actionsOf(sent), [
        'notion/openOauthPage',
        'notion/takeLoginError',
      ]);
    });

    it('logs out with Remove, and opens the authorized apps page of GitHub', async () => {
      const { sent, createdTabs } = mockChrome({
        responses: {
          'github/logout': {
            ok: true,
            message: {
              authorizedAppsUrl: 'https://github.com/settings/applications',
            },
          },
        },
      });
      initializeButtonEvents();
      $$('#github-authentication').classList.add('delete');

      $$('#github-authentication').click();
      await flush();

      assert.deepEqual(actionsOf(sent), ['github/logout']);
      assert.deepEqual(createdTabs, [
        { url: 'https://github.com/settings/applications' },
      ]);
    });
  });

  describe('auto upload', () => {
    it('saves the option of the platform when it is switched', async () => {
      const { storage } = mockChrome();
      initializeButtonEvents();

      $$('#notion-auto-upload').click();
      await flush();
      assert.equal(storage.notionAutoUpload, true);
      assert.equal(storage.githubAutoUpload, undefined);

      $$('#notion-auto-upload').click();
      await flush();
      assert.equal(storage.notionAutoUpload, false);
    });

    it('shows an error when the option cannot be saved', async () => {
      mockChrome();
      globalThis.chrome.storage.local.set = async () => {
        throw new Error('QUOTA_BYTES quota exceeded');
      };
      initializeButtonEvents();

      $$('#github-auto-upload').click();
      await flush();

      assert.equal(
        toast().textContent,
        'Failed to save the setting. Try again.',
      );
    });
  });

  describe('repository list', () => {
    it('lists the repositories, and saves the selected one', async () => {
      const { storage } = mockChrome({
        responses: {
          'github/getRepositories': {
            ok: true,
            message: [{ name: 'solutions' }, { name: 'algorithms' }],
          },
        },
      });
      initializeButtonEvents();

      $$('#uploaded-repository').click();
      await flush();

      const items = [
        ...document.querySelectorAll('#repository-list li button'),
      ];
      assert.deepEqual(
        items.map((item) => item.textContent),
        ['solutions', 'algorithms'],
      );
      assert.ok($$('#repository-list').classList.contains('is-active'));
      assert.ok($$('.content-wrapper').classList.contains('overlay'));
      // The list ends with the page to install the GitHub App on more repositories.
      const install = $$('#repository-list li.install a');
      assert.equal(install.href, GITHUB_CONFIG.INSTALL_URL);
      assert.equal(install.target, '_blank');

      items[1].click();
      await flush();

      assert.equal($$('#uploaded-repository').textContent, 'algorithms');
      assert.equal(storage.githubUploadedRepository, 'algorithms');
      // A click anywhere closes the list.
      assert.ok(!$$('#repository-list').classList.contains('is-active'));
      assert.ok(!$$('.content-wrapper').classList.contains('overlay'));
    });

    it('shows a name from GitHub as text, not as HTML', async () => {
      mockChrome({
        responses: {
          'github/getRepositories': {
            ok: true,
            message: [{ name: '<img src=x onerror=alert(1)>' }],
          },
        },
      });
      initializeButtonEvents();

      $$('#uploaded-repository').click();
      await flush();

      assert.equal($$('#repository-list img'), null);
      assert.equal(
        $$('#repository-list li button').textContent,
        '<img src=x onerror=alert(1)>',
      );
    });

    it('shows why the list cannot be loaded, and keeps the list', async () => {
      mockChrome({
        responses: {
          'github/getRepositories': {
            ok: false,
            message: 'Log in to GitHub in the extension popup first.',
          },
        },
      });
      initializeButtonEvents();

      $$('#uploaded-repository').click();
      await flush();

      assert.equal(
        toast().textContent,
        'Log in to GitHub in the extension popup first.',
      );
      assert.equal(
        $$('#repository-list li p').textContent,
        'Require Authentication',
      );
      assert.ok(!$$('#repository-list').classList.contains('is-active'));
    });
  });

  describe('database list', () => {
    it('lists the data sources as databases, and saves the name and the data source ID of the selected one', async () => {
      const { storage } = mockChrome({
        responses: {
          'notion/getDatabases': {
            ok: true,
            message: [
              { id: 'ds-1', title: [{ plain_text: 'Problems' }] },
              { id: 'ds-2', title: [] },
            ],
          },
        },
      });
      initializeButtonEvents();

      $$('#uploaded-database').click();
      await flush();

      const items = [
        ...document.querySelectorAll('#notion-database-list li button'),
      ];
      assert.deepEqual(
        items.map((item) => [
          item.textContent,
          item.getAttribute('data-source-id'),
        ]),
        [
          ['Problems', 'ds-1'],
          ['Untitled', 'ds-2'],
        ],
      );
      assert.ok($$('#notion-database-list').classList.contains('is-active'));

      items[0].click();
      await flush();

      assert.equal($$('#uploaded-database').textContent, 'Problems');
      assert.equal(storage.notionUploadedDatabase, 'Problems');
      assert.equal(storage.notionUploadedDataSourceId, 'ds-1');
    });

    it('shows why the list cannot be loaded', async () => {
      mockChrome({
        responses: {
          'notion/getDatabases': {
            ok: false,
            message: 'Log in to Notion in the extension popup first.',
          },
        },
      });
      initializeButtonEvents();

      $$('#uploaded-database').click();
      await flush();

      assert.equal(
        toast().textContent,
        'Log in to Notion in the extension popup first.',
      );
    });
  });

  describe('dark mode', () => {
    it('toggles the light mode without closing an open list', async () => {
      mockChrome();
      initializeButtonEvents();
      $$('#repository-list').classList.add('is-active');

      $$('.dark-light').click();
      assert.ok(document.body.classList.contains('light-mode'));
      assert.equal($$('.dark-light').getAttribute('aria-pressed'), 'true');
      assert.ok($$('#repository-list').classList.contains('is-active'));

      $$('.dark-light').click();
      assert.ok(!document.body.classList.contains('light-mode'));
      assert.equal($$('.dark-light').getAttribute('aria-pressed'), 'false');
    });
  });

  describe('keyboard', () => {
    const repositories = {
      'github/getRepositories': {
        ok: true,
        message: [{ name: 'solutions' }, { name: 'algorithms' }],
      },
    };

    const pressEscape = () =>
      document.dispatchEvent(
        new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );

    it('uses buttons for the controls, which Tab, Enter and Space reach', () => {
      ['.dark-light', '#uploaded-repository', '#uploaded-database'].forEach(
        (selector) => {
          assert.equal($$(selector).tagName, 'BUTTON', selector);
          assert.equal($$(selector).type, 'button', selector);
        },
      );
      assert.equal($$('.dark-light').getAttribute('aria-label'), 'Light mode');
      assert.equal(
        $$('#uploaded-repository').getAttribute('aria-controls'),
        'repository-list',
      );
      assert.equal(
        $$('#uploaded-database').getAttribute('aria-controls'),
        'notion-database-list',
      );
    });

    it('opens a list with its first item focused, and tells that it is open', async () => {
      mockChrome({ responses: repositories });
      initializeButtonEvents();
      assert.equal(
        $$('#uploaded-repository').getAttribute('aria-expanded'),
        'false',
      );

      $$('#uploaded-repository').click();
      await flush();

      assert.equal(
        $$('#uploaded-repository').getAttribute('aria-expanded'),
        'true',
      );
      assert.equal(document.activeElement, $$('#repository-list li button'));
      assert.equal(document.activeElement.textContent, 'solutions');
    });

    it('closes the list with Escape and moves the focus back to its button', async () => {
      mockChrome({ responses: repositories });
      initializeButtonEvents();
      $$('#uploaded-repository').click();
      await flush();

      pressEscape();

      assert.ok(!$$('#repository-list').classList.contains('is-active'));
      assert.ok(!$$('.content-wrapper').classList.contains('overlay'));
      assert.equal(
        $$('#uploaded-repository').getAttribute('aria-expanded'),
        'false',
      );
      assert.equal(document.activeElement, $$('#uploaded-repository'));
    });

    it('moves the focus back to the button after an item is selected', async () => {
      const { storage } = mockChrome({ responses: repositories });
      initializeButtonEvents();
      $$('#uploaded-repository').click();
      await flush();

      // Enter or Space on a focused button clicks it.
      document.querySelectorAll('#repository-list li button')[1].click();
      await flush();

      assert.equal(storage.githubUploadedRepository, 'algorithms');
      assert.equal(document.activeElement, $$('#uploaded-repository'));
      assert.equal(
        $$('#uploaded-repository').getAttribute('aria-expanded'),
        'false',
      );
    });

    it('focuses the install link when no repository is listed yet', async () => {
      mockChrome({
        responses: { 'github/getRepositories': { ok: true, message: [] } },
      });
      initializeButtonEvents();

      $$('#uploaded-repository').click();
      await flush();

      assert.equal(document.activeElement, $$('#repository-list li.install a'));
    });

    it('does not select the placeholder text of a list', async () => {
      const { storage } = mockChrome();
      initializeButtonEvents();

      $$('#repository-list li p').click();
      await flush();

      assert.equal(storage.githubUploadedRepository, undefined);
      assert.equal(
        $$('#uploaded-repository').textContent.trim(),
        'Select Repository',
      );
    });
  });

  describe('toast', () => {
    it('shows one message at a time, with a role for screen readers', () => {
      showToast('First');
      showToast('Second', 'error');

      const toasts = document.querySelectorAll('.scu-toast');
      assert.equal(toasts.length, 1);
      assert.equal(toasts[0].textContent, 'Second');
      assert.equal(toasts[0].getAttribute('role'), 'alert');
      assert.ok(toasts[0].classList.contains('scu-toast-error'));
    });

    it('shows a default message without one', () => {
      showToast(undefined, 'error');

      assert.equal(toast().textContent, 'Something went wrong.');
      assert.equal(toast().getAttribute('role'), 'alert');
    });

    it('uses the status role for information, and disappears after 4 seconds', () => {
      showToast('Saved.');
      assert.equal(toast().getAttribute('role'), 'status');
      assert.ok(toast().classList.contains('scu-toast-info'));

      mock.timers.tick(3999);
      assert.notEqual(toast(), null);
      mock.timers.tick(1);
      assert.equal(toast(), null);
    });
  });
});
