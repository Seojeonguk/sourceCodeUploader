import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, describe, it } from 'node:test';

import { JSDOM, VirtualConsole } from 'jsdom';

import {
  createJudgeBody,
  createJudgeEvents,
  JUDGE_URL,
  SOURCE_CODE,
} from '../fixtures/jungol/judge.js';

// The scripts that run in the page's world, in order (scripts/judgeSites.js).
const SCRIPTS = [
  'scripts/jungol/helpers.js',
  'scripts/jungol/judgeWatcher.js',
].map((file) =>
  readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'),
);

let dom;

const settle = async () => {
  for (let i = 0; i < 20; i += 1) {
    // eslint-disable-next-line no-await-in-loop -- let each promise chain finish
    await new Promise(setImmediate);
  }
};

/**
 * A streamed answer, like the judge's: one chunk per string.
 * @param {string[]} chunks
 */
const streamOf = (chunks) =>
  new Response(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
        controller.close();
      },
    }),
    { headers: { 'content-type': 'text/event-stream; charset=utf-8' } },
  );

/**
 * Opens a JUNGOL page with the site's fetch, then runs the scripts in it at document_start.
 * @param {(url: string, init: Object) => Promise<Response>} siteFetch - The fetch of the page.
 * @returns {{ window: Window, messages: Object[] }}
 */
const openPage = (siteFetch) => {
  dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://jungol.co.kr/problem/1000',
    runScripts: 'outside-only',
    virtualConsole: new VirtualConsole(),
  });
  const { window } = dom;
  window.fetch = siteFetch;
  const messages = [];
  window.addEventListener('message', (event) => messages.push(event.data));
  SCRIPTS.forEach((script) => window.eval(script));
  return { window, messages };
};

/**
 * Sends a judge request the way the page does, and reads the whole answer as the page would.
 */
const judge = async (window, body = createJudgeBody()) => {
  const response = await window.fetch(JUDGE_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'text/event-stream',
    },
    credentials: 'include',
    body,
  });
  return response.text();
};

describe('JUNGOL judge watcher', { timeout: 5000 }, () => {
  afterEach(() => {
    dom?.window.close();
  });

  it('tells about an accepted submission once, with its code', async () => {
    const { window, messages } = openPage(async () =>
      streamOf(createJudgeEvents()),
    );

    await judge(window);
    await settle();

    assert.deepEqual(JSON.parse(JSON.stringify(messages)), [
      {
        type: 'SCU_JUNGOL_ACCEPTED',
        submission: {
          problemId: 1000,
          contestId: null,
          language: 'CPP',
          altLanguage: 'CPP20',
          sourceCode: SOURCE_CODE,
          submissionId: '12345678',
        },
      },
    ]);
  });

  it('leaves the answer to the page as it was', async () => {
    const events = createJudgeEvents();
    const { window } = openPage(async () => streamOf(events));

    assert.equal(await judge(window), events.join(''));
  });

  it('passes the request to the page fetch unchanged, and returns its answer', async () => {
    const calls = [];
    const answer = streamOf(createJudgeEvents());
    const { window } = openPage(async (...args) => {
      calls.push(args);
      return answer;
    });
    const init = { method: 'POST', body: createJudgeBody() };

    const response = await window.fetch(JUDGE_URL, init);

    assert.equal(response, answer);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], JUDGE_URL);
    assert.equal(calls[0][1], init);
  });

  it('calls the page fetch on window, as the browser requires', async () => {
    let self;
    const { window } = openPage(async function siteFetch() {
      self = this;
      return new Response('{}');
    });
    const client = { fetch: window.fetch };

    await client.fetch('https://api.jungol.co.kr/init');

    assert.equal(self, window);
  });

  it('finds the verdict when an event is split across chunks', async () => {
    const stream = createJudgeEvents().join('');
    const cut = stream.indexOf('"r":"AC"');
    const { window, messages } = openPage(async () =>
      streamOf([stream.slice(0, cut), stream.slice(cut)]),
    );

    await judge(window);
    await settle();

    assert.equal(messages.length, 1);
  });

  it('says nothing about a submission that is not accepted', async () => {
    const { window, messages } = openPage(async () =>
      streamOf(createJudgeEvents({ r: 'CE' })),
    );

    await judge(window);
    await settle();

    assert.deepEqual(messages, []);
  });

  it('does not read the other requests of the page', async () => {
    let cloned = false;
    const answer = new Response('{}');
    const { clone } = answer;
    answer.clone = () => {
      cloned = true;
      return clone.call(answer);
    };
    const { window, messages } = openPage(async () => answer);

    await window.fetch('https://api.jungol.co.kr/account/my', {
      body: createJudgeBody(),
    });
    await settle();

    assert.equal(cloned, false);
    assert.deepEqual(messages, []);
  });

  it('keeps a failed request failing for the page', async () => {
    const error = new TypeError('Failed to fetch');
    const { window } = openPage(async () => {
      throw error;
    });

    await assert.rejects(judge(window), (thrown) => thrown === error);
  });
});
