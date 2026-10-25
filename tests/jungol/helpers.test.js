import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

import {
  createJudgeBody,
  createJudgeEvents,
  PROBLEM_DATA,
  SOURCE_CODE,
} from '../fixtures/jungol/judge.js';

// helpers.js is a classic content script, so it is run in a sandbox instead of imported.
// Objects created in the sandbox are copied before deepEqual, since their prototype differs.
const loadHelpers = () => {
  const source = readFileSync(
    new URL('../../scripts/jungol/helpers.js', import.meta.url),
    'utf8',
  );
  const context = vm.createContext({});
  vm.runInContext(source, context);
  return context.SCU_JUNGOL;
};

const {
  formatTier,
  getExtensionFromLanguage,
  isAcceptedFinish,
  parseEventStream,
  parseJudgeRequest,
  readProblemData,
} = loadHelpers();

const copy = (value) => JSON.parse(JSON.stringify(value));

describe('parseJudgeRequest', () => {
  it('reads the problem, the language and the code of the judge request', () => {
    assert.deepEqual(copy(parseJudgeRequest(createJudgeBody())), {
      problemId: 1000,
      contestId: null,
      language: 'CPP',
      altLanguage: 'CPP20',
      sourceCode: SOURCE_CODE,
    });
  });

  it('keeps the contest of a contest problem', () => {
    assert.equal(
      parseJudgeRequest(createJudgeBody({ contestId: 4238 })).contestId,
      4238,
    );
  });

  [
    ['a body that is not text', new Uint8Array([1, 2])],
    ['a body that is not JSON', 'problemId=1000'],
    ['a body without code', createJudgeBody({ sourceText: 1 })],
    ['a body without a problem', createJudgeBody({ problemId: 'x' })],
    ['no body', undefined],
  ].forEach(([name, body]) => {
    it(`returns null for ${name}`, () => {
      assert.equal(parseJudgeRequest(body), null);
    });
  });
});

describe('parseEventStream', () => {
  it('reads the complete events and keeps the rest for the next chunk', () => {
    const [first, second] = createJudgeEvents();
    const { events, rest } = parseEventStream(first + second.slice(0, 10));

    assert.deepEqual(copy(events), [{ type: 'message', data: { ok: true } }]);
    assert.equal(rest, second.slice(0, 10));
  });

  it('reads the event name and the JSON data of each event', () => {
    const { events } = parseEventStream(createJudgeEvents().join(''));

    assert.deepEqual(copy(events.map(({ type }) => type)), [
      'message',
      'JUDGE_PROGRESS',
      'JUDGE_PROGRESS',
      'JUDGE_FINISH',
      'result',
    ]);
    assert.equal(events[3].data.data.r, 'AC');
  });

  it('accepts CRLF line breaks and data that is not JSON', () => {
    const { events } = parseEventStream('event: ping\r\ndata: hello\r\n\r\n');

    assert.deepEqual(copy(events), [{ type: 'ping', data: null }]);
  });
});

describe('isAcceptedFinish', () => {
  const finishOf = (options) =>
    parseEventStream(createJudgeEvents(options).join('')).events.find(
      ({ type }) => type === 'JUDGE_FINISH',
    );

  it('is true only for the finish event of an accepted submission', () => {
    assert.equal(isAcceptedFinish(finishOf()), true);
    assert.equal(isAcceptedFinish(finishOf({ r: 'CE' })), false);
  });

  it('reads the verdict, not the progress events', () => {
    parseEventStream(createJudgeEvents().join(''))
      .events.filter(({ type }) => type !== 'JUDGE_FINISH')
      .forEach((event) => assert.equal(isAcceptedFinish(event), false));
  });

  it('also takes the finish named only in its data, as the site does', () => {
    const event = { type: 'message', data: finishOf().data };
    assert.equal(isAcceptedFinish(event), true);
  });
});

describe('getExtensionFromLanguage', () => {
  it('uses the extension of the base language, as the site does', () => {
    assert.equal(getExtensionFromLanguage('CPP'), 'cpp');
    assert.equal(getExtensionFromLanguage('PYTHON3'), 'py');
    assert.equal(getExtensionFromLanguage('JAVA'), 'java');
    assert.equal(getExtensionFromLanguage('C'), 'c');
    assert.equal(getExtensionFromLanguage('kotlin'), 'kt');
  });

  it('falls back to txt for an unknown language', () => {
    assert.equal(getExtensionFromLanguage('BRAINFUCK'), 'txt');
    assert.equal(getExtensionFromLanguage(undefined), 'txt');
  });
});

describe('readProblemData', () => {
  it('reads the title, the tier and the tags of a real problem page', () => {
    assert.deepEqual(
      copy(readProblemData(JSON.parse(PROBLEM_DATA[1000]), 1000)),
      {
        title: '두 정수 더하기 (A+B)',
        tier: 'Bronze V',
        tags: [
          'arithmetic',
          '구현',
          'math',
          'implement',
          'ad_hoc',
          'precomputation',
        ],
      },
    );
  });

  it('reads an unranked problem without tags', () => {
    assert.deepEqual(
      copy(readProblemData(JSON.parse(PROBLEM_DATA[1525]), 1525)),
      { title: '사다리(ladder)', tier: 'Unranked', tags: [] },
    );
  });

  it('returns null for another problem or a page without one', () => {
    assert.equal(readProblemData(JSON.parse(PROBLEM_DATA[1000]), 1525), null);
    assert.equal(readProblemData({ type: 'redirect' }, 1000), null);
    assert.equal(readProblemData(null, 1000), null);
  });
});

describe('formatTier', () => {
  it('keeps a tier and drops unranked', () => {
    assert.equal(formatTier('Bronze V'), 'Bronze V');
    assert.equal(formatTier('Unranked'), null);
    assert.equal(formatTier(null), null);
  });
});
