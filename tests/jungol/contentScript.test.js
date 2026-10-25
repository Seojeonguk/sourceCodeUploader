import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, describe, it } from 'node:test';

import { JSDOM, VirtualConsole } from 'jsdom';

import { PROBLEM_DATA, SOURCE_CODE } from '../fixtures/jungol/judge.js';
import { chromeI18n } from '../helpers/i18n.js';

const EXTENSION_ORIGIN = 'chrome-extension://mfhbpmbchemfhijjamldbkidlegfmaff';

// The scripts that run in the extension's world, in order (scripts/judgeSites.js).
const SCRIPTS = [
  'scripts/content/ui.js',
  'scripts/jungol/helpers.js',
  'scripts/jungol/index.js',
].map((file) =>
  readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'),
);

const SUBMISSION = Object.freeze({
  problemId: 1000,
  contestId: null,
  language: 'CPP',
  altLanguage: 'CPP20',
  sourceCode: SOURCE_CODE,
  submissionId: '12345678',
});

let dom;

const settle = async () => {
  for (let i = 0; i < 10; i += 1) {
    // eslint-disable-next-line no-await-in-loop -- let each promise chain finish
    await new Promise(setImmediate);
  }
};

/**
 * Opens a JUNGOL page and runs the content scripts in it.
 * @param {Object} [param]
 * @param {Object} [param.responses] - The background responses, keyed by `platform/action`.
 * @param {Object} [param.pages] - The JSON that `fetch` returns, keyed by path.
 */
const openPage = ({ responses = {}, pages = {} } = {}) => {
  dom = new JSDOM('<!doctype html><html><body><main></main></body></html>', {
    url: 'https://jungol.co.kr/problem/1000',
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
  window.fetch = async (input, init) => {
    const url = new URL(input);
    fetched.push({ url: url.href, credentials: init?.credentials });
    const page = pages[url.pathname];
    return page === undefined
      ? { ok: false, status: 404, json: async () => ({}) }
      : { ok: true, status: 200, json: async () => JSON.parse(page) };
  };
  window.setTimeout = (callback, delay) =>
    delay <= 1000 ? Promise.resolve().then(callback) : 0;
  window.console.warn = () => {};
  window.console.error = () => {};

  SCRIPTS.forEach((script) => window.eval(script));
  return { window, document: window.document, sent, fetched };
};

/**
 * Tells the content script about an accepted submission, as judgeWatcher.js does from the
 * page's world. jsdom's postMessage does not set event.source, so the event is dispatched.
 */
const accept = async (
  window,
  submission = SUBMISSION,
  { source = window, origin = 'https://jungol.co.kr' } = {},
) => {
  window.dispatchEvent(
    new window.MessageEvent('message', {
      source,
      origin,
      data: { type: 'SCU_JUNGOL_ACCEPTED', submission },
    }),
  );
  await settle();
};

// The upload messages, without the ones that read the auto upload options.
const uploads = (sent) =>
  sent.filter(({ action }) => action === 'commit' || action === 'upload');
const panelOf = (document) => document.querySelector('.scu-jungol-panel');
const toasts = (document) =>
  [...document.querySelectorAll('.scu-content-toast')].map(
    (toast) => toast.textContent,
  );

describe('JUNGOL content script', { timeout: 5000 }, () => {
  afterEach(() => {
    dom?.window.close();
  });

  describe('after an accepted judge', () => {
    it('shows the upload buttons with the problem', async () => {
      const { window, document } = openPage();

      assert.equal(panelOf(document), null);
      await accept(window);

      const panel = panelOf(document);
      assert.match(panel.textContent, /JUNGOL 1000: accepted/);
      assert.deepEqual(
        [...panel.querySelectorAll('.scu-content-upload')].map(
          (button) => button.title,
        ),
        ['Upload to GitHub', 'Upload to Notion'],
      );
    });

    it('keeps one panel, for the last accepted submission', async () => {
      const { window, document } = openPage();

      await accept(window);
      await accept(window, { ...SUBMISSION, problemId: 1525 });

      assert.equal(document.querySelectorAll('.scu-jungol-panel').length, 1);
      assert.match(panelOf(document).textContent, /JUNGOL 1525/);
    });

    it('closes the panel', async () => {
      const { window, document } = openPage();
      await accept(window);

      panelOf(document).querySelector('.scu-jungol-close').click();

      assert.equal(panelOf(document), null);
    });

    [
      [
        'another window',
        (window) => ({ source: {}, origin: window.location.origin }),
      ],
      [
        'another origin',
        (window) => ({ source: window, origin: 'https://evil.example' }),
      ],
    ].forEach(([name, from]) => {
      it(`ignores a message from ${name}`, async () => {
        const { window, document } = openPage();

        await accept(window, SUBMISSION, from(window));

        assert.equal(panelOf(document), null);
      });
    });

    [
      ['without code', { sourceCode: '' }],
      ['with a problem that is not a number', { problemId: '1000/../x' }],
      ['without a language', { language: null }],
    ].forEach(([name, change]) => {
      it(`ignores a submission ${name}`, async () => {
        const { window, document } = openPage();

        await accept(window, { ...SUBMISSION, ...change });

        assert.equal(panelOf(document), null);
      });
    });
  });

  describe('upload', () => {
    it('sends the code with the problem info from the problem page', async () => {
      const { window, document, sent, fetched } = openPage({
        responses: {
          'github/commit': {
            ok: true,
            message: 'https://github.com/me/solutions/blob/main/x.cpp',
          },
        },
        pages: { '/problem/1000/__data.json': PROBLEM_DATA[1000] },
      });
      await accept(window);

      document.querySelector('[data-platform="github"]').click();
      await settle();

      assert.deepEqual(fetched, [
        {
          url: 'https://jungol.co.kr/problem/1000/__data.json',
          credentials: 'include',
        },
      ]);
      assert.deepEqual(JSON.parse(JSON.stringify(uploads(sent)[0])), {
        platform: 'github',
        action: 'commit',
        payload: {
          type: 'JUNGOL',
          problemId: '1000',
          title: '1000 - 두 정수 더하기 (A+B)',
          extension: 'cpp',
          sourceCode: SOURCE_CODE,
          problemInfo: {
            title: '1000 - 두 정수 더하기 (A+B)',
            level: 'Bronze V',
            tags: [
              'arithmetic',
              '구현',
              'math',
              'implement',
              'ad_hoc',
              'precomputation',
            ],
            url: 'https://jungol.co.kr/problem/1000',
          },
        },
      });
      assert.deepEqual(toasts(document), ['Uploaded to GitHub. Open']);
    });

    it('has no level for an unranked problem', async () => {
      const { window, document, sent } = openPage({
        pages: { '/problem/1525/__data.json': PROBLEM_DATA[1525] },
      });
      await accept(window, {
        ...SUBMISSION,
        problemId: 1525,
        language: 'PYTHON3',
      });

      document.querySelector('[data-platform="notion"]').click();
      await settle();

      assert.equal(uploads(sent)[0].action, 'upload');
      assert.equal(uploads(sent)[0].payload.title, '1525 - 사다리(ladder)');
      assert.equal(uploads(sent)[0].payload.extension, 'py');
      assert.equal(uploads(sent)[0].payload.problemInfo.level, null);
    });

    it('still uploads with the problem ID when the problem page cannot be read', async () => {
      const { window, document, sent } = openPage();
      await accept(window, { ...SUBMISSION, contestId: 4238 });

      document.querySelector('[data-platform="github"]').click();
      await settle();

      assert.equal(uploads(sent)[0].payload.title, '1000');
      assert.equal(uploads(sent)[0].payload.problemInfo.level, null);
      assert.deepEqual([...uploads(sent)[0].payload.problemInfo.tags], []);
      assert.equal(
        uploads(sent)[0].payload.problemInfo.url,
        'https://jungol.co.kr/problem/1000',
      );
    });

    it('shows why the upload failed', async () => {
      const { window, document } = openPage({
        responses: {
          'github/commit': {
            ok: false,
            message: 'Log in to GitHub in the extension popup first.',
          },
        },
      });
      await accept(window);

      document.querySelector('[data-platform="github"]').click();
      await settle();

      assert.deepEqual(toasts(document), [
        'Log in to GitHub in the extension popup first.',
      ]);
    });
  });

  describe('auto upload', () => {
    const AUTO_GITHUB = Object.freeze({
      'github/getAutoUpload': { ok: true, message: true },
      'notion/getAutoUpload': { ok: true, message: false },
      'github/commit': {
        ok: true,
        message: 'https://github.com/me/solutions/blob/main/x.cpp',
      },
    });

    it('uploads an accepted submission to the platforms with auto upload on', async () => {
      const { window, document, sent } = openPage({
        responses: AUTO_GITHUB,
        pages: { '/problem/1000/__data.json': PROBLEM_DATA[1000] },
      });

      await accept(window);

      const done = uploads(sent);
      assert.equal(done.length, 1);
      assert.equal(done[0].platform, 'github');
      assert.equal(done[0].payload.title, '1000 - 두 정수 더하기 (A+B)');
      assert.equal(done[0].payload.sourceCode, SOURCE_CODE);
      assert.deepEqual(toasts(document), ['Uploaded to GitHub. Open']);
      // The buttons stay for the other platform.
      assert.ok(panelOf(document));
    });

    it('uploads nothing when auto upload is off', async () => {
      const { window, sent } = openPage();

      await accept(window);

      assert.deepEqual(uploads(sent), []);
    });

    it('uploads a submission once, even if it is told again', async () => {
      const { window, sent } = openPage({ responses: AUTO_GITHUB });

      await accept(window);
      await accept(window);

      assert.equal(uploads(sent).length, 1);
    });

    it('uploads each accepted submission of the page', async () => {
      const { window, sent } = openPage({ responses: AUTO_GITHUB });

      await accept(window);
      await accept(window, { ...SUBMISSION, submissionId: '12345679' });

      assert.equal(uploads(sent).length, 2);
    });

    it('leaves a platform that is already uploading after a click', async () => {
      const { window, document, sent } = openPage({
        responses: {
          ...AUTO_GITHUB,
          'notion/getAutoUpload': { ok: true, message: true },
        },
      });
      const { sendMessage } = window.chrome.runtime;
      // The user clicks the GitHub button as soon as the panel appears.
      window.chrome.runtime.sendMessage = (message, callback) => {
        if (
          message.action === 'getAutoUpload' &&
          message.platform === 'github'
        ) {
          document.querySelector('[data-platform="github"]').disabled = true;
        }
        sendMessage(message, callback);
      };

      await accept(window);

      assert.deepEqual(
        uploads(sent).map(({ platform }) => platform),
        ['notion'],
      );
    });

    it('uploads nothing for a message from another origin', async () => {
      const { window, sent } = openPage({ responses: AUTO_GITHUB });

      await accept(window, SUBMISSION, {
        source: window,
        origin: 'https://evil.example',
      });

      assert.deepEqual(sent, []);
    });
  });
});
