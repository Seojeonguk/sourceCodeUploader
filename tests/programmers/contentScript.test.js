import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, describe, it } from 'node:test';

import { JSDOM, VirtualConsole } from 'jsdom';
import { chromeI18n } from '../helpers/i18n.js';

const readRepoFile = (path) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

// The scripts that manifest.json loads on Programmers, in order: the shared UI comes first.
const [PROGRAMMERS_SCRIPTS] = JSON.parse(
  readRepoFile('manifest.json'),
).content_scripts;
const SOURCES = PROGRAMMERS_SCRIPTS.js.map(readRepoFile);

const EXTENSION_ORIGIN = 'chrome-extension://mfhbpmbchemfhijjamldbkidlegfmaff';
const LESSON_PATH = '/learn/courses/30/lessons/1845';
const SOURCE_CODE = 'def solution(nums):\n    return 1\n';

const EDITOR_HTML = `
  <div class="editor">
    <ul><li class="nav-item"><a>solution.py</a></li></ul>
    <div class="code-editor"><div class="CodeMirror"></div></div>
  </div>`;

/**
 * Creates a Programmers lesson page. The marker of the source extractor is there by default,
 * so the content script does not wait for the injected script to load.
 */
const createPageHtml = ({
  editor = EDITOR_HTML,
  extractorLoaded = true,
} = {}) => `<!doctype html>
<html>
  <head><title>폰켓몬 | 프로그래머스 스쿨</title></head>
  <body>
    ${extractorLoaded ? '<script data-scu-programmers-extractor="true"></script>' : ''}
    <ol class="breadcrumb">
      <li>코딩테스트 연습</li>
      <li>해시</li>
      <li>폰켓몬</li>
    </ol>
    <div class="lesson-content" data-lesson-id="1845" data-challenge-level="1">
      <div class="algorithm-title"><span class="challenge-title">폰켓몬</span></div>
      <div id="tour7"><button>Python3</button></div>
      ${editor}
    </div>
    <div id="modal-dialog" style="display: none">
      <div class="modal-header"><h4></h4></div>
    </div>
  </body>
</html>`;

let dom;

// Lets the pending promises and the zero-delay timers of the test (such as the mocked
// chrome.runtime.sendMessage) run.
const settle = async () => {
  await new Promise(setImmediate);
  await new Promise(setImmediate);
};

/**
 * A clock for the timers of the content script, so the tests advance them instead of waiting.
 * Only the page's setTimeout / clearTimeout use it: jsdom still delivers postMessage with the
 * real timers, which the source extractor needs.
 * @returns {{ setTimeout: Function, clearTimeout: Function, tick: (ms: number) => Promise<void> }}
 */
const createClock = () => {
  let now = 0;
  let lastId = 0;
  const timers = new Map();

  const nextDueTimer = (end) =>
    [...timers]
      .filter(([, timer]) => timer.at <= end)
      .sort(([, a], [, b]) => a.at - b.at)[0];

  return {
    setTimeout: (callback, delay = 0, ...args) => {
      lastId += 1;
      timers.set(lastId, { at: now + delay, callback, args });
      return lastId;
    },
    clearTimeout: (id) => {
      timers.delete(id);
    },
    /**
     * Moves the clock forward, running the timers that are due in order.
     * @param {number} ms - How far to move it, in milliseconds.
     */
    tick: async (ms) => {
      const end = now + ms;
      // A DOM change schedules its check in a MutationObserver callback, which runs first.
      await settle();
      let due = nextDueTimer(end);
      while (due) {
        const [id, timer] = due;
        timers.delete(id);
        now = timer.at;
        timer.callback(...timer.args);
        // eslint-disable-next-line no-await-in-loop -- run each timer's follow-up before the next
        await settle();
        due = nextDueTimer(end);
      }
      now = end;
    },
  };
};

/**
 * Opens the page and runs the content scripts in it, in the order of manifest.json.
 * @param {Object} [options]
 * @param {string} [options.url] - The page URL.
 * @param {string} [options.html] - The page HTML.
 * @param {Object} [options.responses] - The background responses, keyed by `platform/action`.
 * @param {string} [options.sourceCode] - The code that the page-context extractor returns.
 * @returns {{ window: Window, document: Document, sent: Object[], clock: Object }}
 */
const openPage = ({
  url = `https://school.programmers.co.kr${LESSON_PATH}`,
  html = createPageHtml(),
  responses = {},
  sourceCode = SOURCE_CODE,
} = {}) => {
  dom = new JSDOM(html, {
    url,
    runScripts: 'outside-only',
    virtualConsole: new VirtualConsole(),
  });
  const { window } = dom;
  const sent = [];

  window.chrome = {
    i18n: chromeI18n,
    runtime: {
      id: 'mfhbpmbchemfhijjamldbkidlegfmaff',
      lastError: null,
      getURL: (path) => `${EXTENSION_ORIGIN}/${path}`,
      sendMessage: (message, callback) => {
        sent.push(message);
        const response = responses[`${message.platform}/${message.action}`];
        setTimeout(() => callback(response ?? { ok: true, message: null }), 0);
      },
    },
  };

  // jsdom has no layout, so an element is "rendered" unless it or a parent has
  // display: none, which is how the Bootstrap modal of Programmers is hidden.
  window.HTMLElement.prototype.getClientRects = function getClientRects() {
    for (let element = this; element; element = element.parentElement) {
      if (element.style.display === 'none') {
        return [];
      }
    }
    return [{}];
  };

  // Plays scripts/programmers/sourceExtractor.js, which runs in the page context.
  // jsdom's postMessage does not set event.source, so the response is dispatched with it.
  window.addEventListener('message', (event) => {
    if (event.data?.type !== 'SCU_PROGRAMMERS_SOURCE_REQUEST') {
      return;
    }
    window.dispatchEvent(
      new window.MessageEvent('message', {
        source: window,
        data: {
          type: 'SCU_PROGRAMMERS_SOURCE_RESPONSE',
          requestId: event.data.requestId,
          sourceCode,
        },
      }),
    );
  });

  const clock = createClock();
  window.setTimeout = clock.setTimeout;
  window.clearTimeout = clock.clearTimeout;

  SOURCES.forEach((source) => window.eval(source));

  return { window, document: window.document, sent, clock };
};

const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Waits until the condition is true, for the timers of the content script.
 */
const waitFor = async (condition, timeout = 2000) => {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Timed out waiting for the condition.');
    }
    // eslint-disable-next-line no-await-in-loop -- polling
    await wait(10);
  }
};

const actionsOf = (sent) =>
  sent.map(({ platform, action }) => `${platform}/${action}`);
const uploadsOf = (sent) =>
  actionsOf(sent).filter((action) => !action.endsWith('/getAutoUpload'));

const toastCount = (document) =>
  document.querySelectorAll('.scu-content-toast').length;

/**
 * Shows the result modal with the title, like Programmers does after grading.
 * The content script watches `class` and `style`, which the modal changes when it opens.
 */
const showResult = (document, title) => {
  const modal = document.querySelector('#modal-dialog');
  modal.querySelector('h4').textContent = title;
  modal.style.display = 'block';
};

const closeResult = (document) => {
  const modal = document.querySelector('#modal-dialog');
  modal.style.display = 'none';
};

// How long the content script waits after the page changes before checking the modal.
const RESULT_CHECK_DELAY = 300;

/**
 * Waits long enough for an upload to be sent if the content script started one.
 * After the check, the upload still goes through the background answers and the
 * postMessage round trip, which use the real timers, so a test that expects nothing
 * to happen waits for them before asserting.
 */
const waitForQuiet = () => wait(50);

describe('Programmers content script', () => {
  afterEach(() => {
    dom?.window.close();
    dom = undefined;
  });

  describe('upload buttons', () => {
    it('adds a GitHub and a Notion button next to the editor', () => {
      const { document } = openPage();

      const buttons = [
        ...document.querySelectorAll('.code-editor .scu-content-upload'),
      ];
      assert.deepEqual(
        buttons.map((button) => [button.dataset.platform, button.title]),
        [
          ['github', 'Upload to GitHub'],
          ['notion', 'Upload to Notion'],
        ],
      );
      assert.equal(
        buttons[0].querySelector('img').src,
        `${EXTENSION_ORIGIN}/icon/githubIcon.png`,
      );
    });

    it('adds the buttons when the editor appears later, only once', async () => {
      const { document } = openPage({ html: createPageHtml({ editor: '' }) });
      assert.equal(document.querySelectorAll('.scu-content-upload').length, 0);

      document
        .querySelector('.lesson-content')
        .insertAdjacentHTML('beforeend', EDITOR_HTML);
      await waitFor(
        () => document.querySelectorAll('.scu-content-upload').length > 0,
      );
      document.body.append(document.createElement('div'));
      await wait(20);

      assert.equal(document.querySelectorAll('.scu-content-upload').length, 2);
    });

    it('loads the shared UI before the Programmers scripts', () => {
      assert.deepEqual(PROGRAMMERS_SCRIPTS.js, [
        'scripts/content/ui.js',
        'scripts/programmers/helpers.js',
        'scripts/programmers/index.js',
      ]);
      assert.deepEqual(PROGRAMMERS_SCRIPTS.css, [
        'scripts/content/ui.css',
        'scripts/programmers/programmers.css',
      ]);
    });

    it('places the buttons over the editor', () => {
      const { document } = openPage();

      const wrapper = document.querySelector('.scu-content-wrapper');
      assert.ok(wrapper.classList.contains('scu-programmers-wrapper'));
      assert.equal(wrapper.parentElement.className, 'code-editor');
    });

    it('injects the source extractor into the page once', () => {
      const { document } = openPage({
        html: createPageHtml({ extractorLoaded: false }),
      });

      const scripts = document.querySelectorAll(
        'script[data-scu-programmers-extractor]',
      );
      assert.equal(scripts.length, 1);
      assert.equal(
        scripts[0].src,
        `${EXTENSION_ORIGIN}/scripts/programmers/sourceExtractor.js`,
      );
    });
  });

  describe('upload', () => {
    it('sends the code and the problem info, and links the result', async () => {
      const fileUrl =
        'https://github.com/user/solutions/blob/main/Programmers/폰켓몬.py';
      // On programmers.co.kr, the URL is still the one on school.programmers.co.kr (#213).
      const { document, sent } = openPage({
        url: `https://programmers.co.kr${LESSON_PATH}`,
        responses: { 'github/commit': { ok: true, message: fileUrl } },
      });
      const button = document.querySelector('[data-platform="github"]');

      button.click();
      assert.equal(button.disabled, true);
      await waitFor(() => document.querySelector('.scu-content-toast'));

      assert.equal(sent.length, 1);
      const { platform, action, payload } = sent[0];
      assert.equal(`${platform}/${action}`, 'github/commit');
      assert.deepEqual(JSON.parse(JSON.stringify(payload)), {
        extension: 'py',
        problemId: '1845',
        sourceCode: SOURCE_CODE,
        title: '폰켓몬',
        type: 'Programmers',
        problemInfo: {
          title: '폰켓몬',
          level: 'Lv. 1',
          tags: ['해시'],
          url: `https://school.programmers.co.kr${LESSON_PATH}`,
        },
      });

      const toast = document.querySelector('.scu-content-toast');
      assert.ok(toast.classList.contains('scu-content-toast-success'));
      assert.match(toast.textContent, /^Uploaded to GitHub\./);
      assert.equal(toast.querySelector('a').href, encodeURI(fileUrl));
      assert.equal(toast.querySelector('a').rel, 'noopener noreferrer');
      assert.equal(button.disabled, false);
    });

    it('shows why the upload failed', async () => {
      const { document } = openPage({
        responses: {
          'notion/upload': {
            ok: false,
            message: 'Select a Notion database in the extension popup first.',
          },
        },
      });

      document.querySelector('[data-platform="notion"]').click();
      await waitFor(() => document.querySelector('.scu-content-toast'));

      const toast = document.querySelector('.scu-content-toast');
      assert.ok(toast.classList.contains('scu-content-toast-error'));
      assert.equal(toast.getAttribute('role'), 'alert');
      assert.equal(
        toast.textContent,
        'Select a Notion database in the extension popup first.',
      );
      assert.equal(toast.querySelector('a'), null);
    });

    it('does not upload when the editor is empty', async () => {
      const { document, sent } = openPage({ sourceCode: '  \n' });

      document.querySelector('[data-platform="github"]').click();
      await waitFor(() => document.querySelector('.scu-content-toast'));

      assert.deepEqual(sent, []);
      assert.equal(
        document.querySelector('.scu-content-toast').textContent,
        'Source code not found.',
      );
    });

    it('uses the language in the URL when the editor tab has no file name', async () => {
      const { document, sent } = openPage({
        url: `https://school.programmers.co.kr${LESSON_PATH}?language=java`,
        html: createPageHtml({
          editor:
            '<div class="code-editor"><div class="CodeMirror"></div></div>',
        }),
      });

      document.querySelector('[data-platform="github"]').click();
      await waitFor(() => sent.length > 0);

      assert.equal(sent[0].payload.extension, 'java');
    });

    it('falls back to txt for an unknown language', async () => {
      const { document, sent } = openPage({
        html: createPageHtml({
          editor:
            '<div class="code-editor"><div class="CodeMirror"></div></div>',
        }).replace('<button>Python3</button>', '<button>Brainfuck</button>'),
      });

      document.querySelector('[data-platform="github"]').click();
      await waitFor(() => sent.length > 0);

      assert.equal(sent[0].payload.extension, 'txt');
    });
  });

  describe('auto upload', () => {
    const bothOn = {
      'github/getAutoUpload': { ok: true, message: true },
      'notion/getAutoUpload': { ok: true, message: true },
    };

    it('uploads to the platforms that are on, one by one, when the result is accepted', async () => {
      const { document, sent, clock } = openPage({
        responses: {
          ...bothOn,
          'notion/getAutoUpload': { ok: true, message: false },
        },
      });

      showResult(document, '정답입니다.');
      await clock.tick(RESULT_CHECK_DELAY);
      await waitFor(() => toastCount(document) === 1);
      // The toast changes the page again, which must not upload again.
      await clock.tick(RESULT_CHECK_DELAY);
      await waitForQuiet();

      assert.deepEqual(actionsOf(sent), [
        'github/getAutoUpload',
        'notion/getAutoUpload',
        'github/commit',
      ]);
    });

    it('uploads to GitHub first, then to Notion', async () => {
      const { document, sent, clock } = openPage({ responses: bothOn });

      showResult(document, '정답입니다.');
      await clock.tick(RESULT_CHECK_DELAY);
      await waitFor(() => toastCount(document) === 2);

      assert.deepEqual(uploadsOf(sent), ['github/commit', 'notion/upload']);
    });

    it('uploads once per result, and again after the modal is closed and opened', async () => {
      const { document, sent, clock } = openPage({ responses: bothOn });

      showResult(document, '정답입니다.');
      await clock.tick(RESULT_CHECK_DELAY);
      await waitFor(() => toastCount(document) === 2);

      // The page keeps changing while the modal is open.
      document.body.append(document.createElement('div'));
      await clock.tick(RESULT_CHECK_DELAY);
      await waitForQuiet();
      assert.equal(uploadsOf(sent).length, 2);

      closeResult(document);
      await clock.tick(RESULT_CHECK_DELAY);
      showResult(document, '정답입니다.');
      await clock.tick(RESULT_CHECK_DELAY);
      await waitFor(() => toastCount(document) === 4);
      assert.equal(uploadsOf(sent).length, 4);
    });

    it('reads the code once for both platforms', async () => {
      const { window, document, sent, clock } = openPage({
        responses: bothOn,
      });
      let requests = 0;
      window.addEventListener('message', (event) => {
        if (event.data?.type === 'SCU_PROGRAMMERS_SOURCE_REQUEST') {
          requests += 1;
        }
      });

      showResult(document, '정답입니다.');
      await clock.tick(RESULT_CHECK_DELAY);
      await waitFor(() => toastCount(document) === 2);

      assert.equal(requests, 1);
      assert.deepEqual(uploadsOf(sent), ['github/commit', 'notion/upload']);
    });

    it('shows once that the code is missing, and uploads nothing', async () => {
      const { document, sent, clock } = openPage({
        responses: bothOn,
        sourceCode: '  \n',
      });

      showResult(document, '정답입니다.');
      await clock.tick(RESULT_CHECK_DELAY);
      await waitFor(() => toastCount(document) === 1);
      await waitForQuiet();

      assert.equal(toastCount(document), 1);
      assert.equal(
        document.querySelector('.scu-content-toast').textContent,
        'Source code not found.',
      );
      assert.deepEqual(uploadsOf(sent), []);
    });

    it('skips a platform that a click is already uploading to', async () => {
      const { window, document, sent, clock } = openPage({
        responses: bothOn,
      });
      // The background answers the commit of the click only when the test releases it.
      const { sendMessage } = window.chrome.runtime;
      let release;
      window.chrome.runtime.sendMessage = (message, callback) => {
        if (message.action === 'commit' && !release) {
          sent.push(message);
          release = () => callback({ ok: true, message: null });
          return;
        }
        sendMessage(message, callback);
      };

      document.querySelector('[data-platform="github"]').click();
      await waitFor(() => release);
      showResult(document, '정답입니다.');
      await clock.tick(RESULT_CHECK_DELAY);
      await waitFor(() => toastCount(document) === 1);
      await waitForQuiet();

      assert.deepEqual(uploadsOf(sent), ['github/commit', 'notion/upload']);
      release();
      await waitFor(() => toastCount(document) === 2);
    });

    it('does not upload a wrong answer', async () => {
      const { document, sent, clock } = openPage({ responses: bothOn });

      showResult(document, '틀렸습니다.');
      await clock.tick(RESULT_CHECK_DELAY);
      await waitForQuiet();

      assert.deepEqual(sent, []);
    });

    it('does not upload when the options cannot be read', async () => {
      const { document, sent, clock } = openPage({
        responses: {
          'github/getAutoUpload': { ok: false, message: 'Refused.' },
          'notion/getAutoUpload': { ok: true, message: null },
        },
      });

      showResult(document, '정답입니다.');
      await clock.tick(RESULT_CHECK_DELAY);
      await waitFor(() => sent.length === 2);
      await waitForQuiet();

      assert.deepEqual(uploadsOf(sent), []);
    });
  });
});
