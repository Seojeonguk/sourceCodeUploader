import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, describe, it } from 'node:test';

import { JSDOM, VirtualConsole } from 'jsdom';

import {
  CHALLENGE_HTML,
  createStatusHtml,
  createSubmissionHtml,
  PROBLEM_339B_HTML,
  SUBMISSION_HTML,
  SUBMISSION_SOURCE,
} from '../fixtures/codeforces/pages.js';
import { chromeI18n } from '../helpers/i18n.js';

const EXTENSION_ORIGIN = 'chrome-extension://mfhbpmbchemfhijjamldbkidlegfmaff';
// The saved pages: the user's accepted submission of 339B and its status page.
const SUBMISSION_PATH = '/contest/339/submission/395650158';
const SUBMISSION_URL = `https://codeforces.com${SUBMISSION_PATH}`;
const STATUS_URL = 'https://codeforces.com/contest/339/my';
const PROBLEM_PATH = '/contest/339/problem/B';

// The scripts that the background registers for Codeforces, in order.
const SCRIPTS = [
  'scripts/content/ui.js',
  'scripts/codeforces/helpers.js',
  'scripts/codeforces/index.js',
].map((file) =>
  readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'),
);

let dom;

const settle = async () => {
  for (let i = 0; i < 10; i += 1) {
    // eslint-disable-next-line no-await-in-loop -- let each promise chain finish
    await new Promise(setImmediate);
  }
};

/**
 * Opens a Codeforces page and runs the content scripts in it.
 * @param {Object} param
 * @param {string} param.url - The page URL.
 * @param {string} param.html - The page HTML.
 * @param {Object} [param.responses] - The background responses, keyed by `platform/action`.
 * @param {Object} [param.pages] - The HTML that `fetch` returns, keyed by path.
 * @returns {{ window: Window, document: Document, sent: Object[], fetched: string[] }}
 */
const openPage = ({ url, html, responses = {}, pages = {} }) => {
  dom = new JSDOM(html, {
    url,
    runScripts: 'outside-only',
    virtualConsole: new VirtualConsole(),
  });
  const { window } = dom;
  const sent = [];
  const fetched = [];

  window.chrome = {
    i18n: chromeI18n,
    runtime: {
      id: 'mfhbpmbchemfhijjamldbkidlegfmaff',
      lastError: null,
      getURL: (path) => `${EXTENSION_ORIGIN}/${path}`,
      sendMessage: (message, callback) => {
        sent.push(message);
        const response = responses[`${message.platform}/${message.action}`];
        Promise.resolve().then(() =>
          callback(response ?? { ok: true, message: null }),
        );
      },
    },
  };
  window.fetch = async (input) => {
    const { pathname } = new URL(input);
    fetched.push(pathname);
    const page = pages[pathname];
    return page === undefined
      ? { ok: false, status: 404, text: async () => '' }
      : { ok: true, status: 200, text: async () => page };
  };
  // Runs the short delays of the script at once, and keeps the toasts on the page.
  window.setTimeout = (callback, delay) =>
    delay <= 1000 ? Promise.resolve().then(callback) : 0;
  window.console.warn = () => {};
  window.console.error = () => {};

  SCRIPTS.forEach((script) => window.eval(script));
  return { window, document: window.document, sent, fetched };
};

const actionsOf = (sent) =>
  sent.map(({ platform, action }) => `${platform}/${action}`);
const toasts = (document) =>
  [...document.querySelectorAll('.scu-content-toast')].map(
    (toast) => toast.textContent,
  );

// A script that keeps reacting to its own changes on the page would never settle.
describe('Codeforces content script', { timeout: 5000 }, () => {
  afterEach(() => {
    dom?.window.close();
  });

  describe('on a submission page', () => {
    it('shows the upload buttons above the code of an accepted submission of the user', () => {
      const { document } = openPage({
        url: SUBMISSION_URL,
        html: createSubmissionHtml(),
      });

      const wrapper = document.querySelector('.scu-content-wrapper');
      assert.ok(wrapper);
      assert.equal(wrapper.nextElementSibling.id, 'program-source-text');
      assert.deepEqual(
        [...wrapper.querySelectorAll('button')].map((button) => button.title),
        ['Upload to GitHub', 'Upload to Notion'],
      );
    });

    it('shows the buttons on the same submission opened from the problemset', () => {
      const { document } = openPage({
        url: 'https://codeforces.com/problemset/submission/339/395650158',
        html: SUBMISSION_HTML.problemset,
      });

      assert.ok(document.querySelector('.scu-content-wrapper'));
    });

    it('shows no buttons for a rejected submission in the gym', () => {
      const { document } = openPage({
        url: 'https://codeforces.com/gym/106556/submission/395951285',
        html: SUBMISSION_HTML.gym,
      });

      assert.equal(document.querySelector('.scu-content-wrapper'), null);
    });

    [
      ['of another user', { author: 'tourist' }],
      ['that is not accepted', { verdict: 'WRONG_ANSWER' }],
      ['when no one is logged in', { handle: null }],
      ['without the code', { sourceCode: null }],
    ].forEach(([name, options]) => {
      it(`shows no buttons for a submission ${name}`, () => {
        const { document } = openPage({
          url: SUBMISSION_URL,
          html: createSubmissionHtml(options),
        });

        assert.equal(document.querySelector('.scu-content-wrapper'), null);
      });
    });

    it('uploads the code with the problem info from the problem page', async () => {
      const { document, sent, fetched } = openPage({
        url: SUBMISSION_URL,
        html: createSubmissionHtml(),
        responses: {
          'github/commit': {
            ok: true,
            message: 'https://github.com/me/solutions/blob/main/x.cpp',
          },
        },
        pages: { [PROBLEM_PATH]: PROBLEM_339B_HTML },
      });

      document.querySelector('[data-platform="github"]').click();
      await settle();

      assert.deepEqual(fetched, [PROBLEM_PATH]);
      assert.deepEqual(JSON.parse(JSON.stringify(sent[0])), {
        platform: 'github',
        action: 'commit',
        payload: {
          type: 'Codeforces',
          problemId: '339B',
          title: '339B - Xenia and Ringroad',
          extension: 'cpp',
          sourceCode: SUBMISSION_SOURCE.contest,
          problemInfo: {
            title: '339B - Xenia and Ringroad',
            level: 'Rating 1000',
            tags: ['implementation'],
            url: 'https://codeforces.com/contest/339/problem/B',
          },
        },
      });
      assert.deepEqual(toasts(document), ['Uploaded to GitHub. Open']);
    });

    it('still uploads with the name of the submission when the problem page cannot be read', async () => {
      // The link shows only `339B`; the name is in its title, `B - Xenia and Ringroad`.
      const { document, sent } = openPage({
        url: SUBMISSION_URL,
        html: createSubmissionHtml(),
      });

      document.querySelector('[data-platform="notion"]').click();
      await settle();

      assert.equal(sent[0].action, 'upload');
      assert.equal(sent[0].payload.title, '339B - Xenia and Ringroad');
      assert.equal(sent[0].payload.problemInfo.level, null);
      assert.deepEqual([...sent[0].payload.problemInfo.tags], []);
    });

    it('shows why the upload failed', async () => {
      const { document } = openPage({
        url: SUBMISSION_URL,
        html: createSubmissionHtml(),
        responses: {
          'github/commit': {
            ok: false,
            message: 'Log in to GitHub in the extension popup first.',
          },
        },
      });

      document.querySelector('[data-platform="github"]').click();
      await settle();

      assert.deepEqual(toasts(document), [
        'Log in to GitHub in the extension popup first.',
      ]);
    });
  });

  describe('on a status page', () => {
    const AUTO_GITHUB = {
      'github/getAutoUpload': { ok: true, message: true },
      'notion/getAutoUpload': { ok: true, message: false },
    };

    /**
     * Turns the waiting row into an accepted one, as Codeforces does when judging ends.
     */
    const acceptRow = async (document) => {
      const cell = document.querySelector('.status-verdict-cell');
      cell.setAttribute('waiting', 'false');
      cell.innerHTML =
        '<span class="submissionVerdictWrapper" submissionVerdict="OK"><span class="verdict-accepted">Accepted</span></span>';
      await settle();
    };

    it('uploads a submission of the user that is accepted while the page is open', async () => {
      const { document, sent, fetched } = openPage({
        url: STATUS_URL,
        html: createStatusHtml(),
        responses: AUTO_GITHUB,
        pages: {
          [SUBMISSION_PATH]: SUBMISSION_HTML.contest,
          [PROBLEM_PATH]: PROBLEM_339B_HTML,
        },
      });
      await settle();
      assert.deepEqual(sent, []);

      await acceptRow(document);

      assert.deepEqual(fetched, [SUBMISSION_PATH, PROBLEM_PATH]);
      assert.deepEqual(actionsOf(sent), [
        'github/getAutoUpload',
        'notion/getAutoUpload',
        'github/commit',
      ]);
      assert.equal(sent[2].payload.problemId, '339B');
      assert.equal(sent[2].payload.sourceCode, SUBMISSION_SOURCE.contest);
    });

    it('uploads it once, even if the table changes again', async () => {
      const { document, sent } = openPage({
        url: STATUS_URL,
        html: createStatusHtml(),
        responses: AUTO_GITHUB,
        pages: { [SUBMISSION_PATH]: SUBMISSION_HTML.contest },
      });

      await acceptRow(document);
      document.body.append(document.createElement('div'));
      await settle();

      assert.equal(
        actionsOf(sent).filter((action) => action === 'github/commit').length,
        1,
      );
    });

    it('does not upload a submission that was accepted before the page was opened', async () => {
      const { document, sent } = openPage({
        url: STATUS_URL,
        html: createStatusHtml({ verdict: 'OK', waiting: false }),
        responses: AUTO_GITHUB,
      });
      document.body.append(document.createElement('div'));
      await settle();

      assert.deepEqual(sent, []);
    });

    it('does not upload a submission of another user', async () => {
      const { document, sent } = openPage({
        url: STATUS_URL,
        html: createStatusHtml({ author: 'tourist' }),
        responses: AUTO_GITHUB,
      });

      await acceptRow(document);

      assert.deepEqual(sent, []);
    });

    it('reads nothing when auto upload is off', async () => {
      const { document, fetched, sent } = openPage({
        url: STATUS_URL,
        html: createStatusHtml(),
      });

      await acceptRow(document);

      assert.deepEqual(actionsOf(sent), [
        'github/getAutoUpload',
        'notion/getAutoUpload',
      ]);
      assert.deepEqual(fetched, []);
    });

    it('links to the submission when its code cannot be read, such as behind the Cloudflare check', async () => {
      const { document, sent } = openPage({
        url: STATUS_URL,
        html: createStatusHtml(),
        responses: AUTO_GITHUB,
        pages: { [SUBMISSION_PATH]: CHALLENGE_HTML },
      });

      await acceptRow(document);

      assert.equal(actionsOf(sent).includes('github/commit'), false);
      assert.deepEqual(toasts(document), [
        'The accepted code could not be read. Open the submission and upload it there. Open',
      ]);
      assert.equal(
        document.querySelector('.scu-content-toast a').href,
        SUBMISSION_URL,
      );
    });
  });
});
