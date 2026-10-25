import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');

/**
 * Real `/problem/{id}/__data.json` answers of JUNGOL (2026-10-25), trimmed: the layout nodes
 * (with a token and the account) are `skip`, and the statement fields are removed.
 * 1000 has a tier (Bronze V) and tags; 1525 is unranked and has no tags.
 */
export const PROBLEM_DATA = Object.freeze({
  1000: read('./problem-1000.json'),
  1525: read('./problem-1525.json'),
});

export const JUDGE_URL = 'https://saet.jungol.co.kr/judge';
export const SOURCE_CODE =
  '#include <iostream>\nint main() {\n    int a, b;\n    std::cin >> a >> b;\n    std::cout << a + b;\n}\n';

/**
 * The body that the problem page sends to the judge, as seen in a logged-in browser (#277):
 * `contestId` is null outside a contest.
 */
export const createJudgeBody = ({
  problemId = 1000,
  contestId = null,
  language = 'CPP',
  altLanguage = 'CPP20',
  sourceText = SOURCE_CODE,
} = {}) =>
  JSON.stringify({ problemId, contestId, language, altLanguage, sourceText });

const event = (name, data) =>
  `${name === 'message' ? '' : `event: ${name}\n`}data: ${JSON.stringify(data)}\n\n`;

/**
 * The events of the judge stream, reconstructed from the field names and types seen in a
 * logged-in browser (#277); the values are made up. The stream sends `message`, then
 * `JUDGE_PROGRESS` while judging (`r`: `CP`, then `RUN`), `JUDGE_FINISH` and `result`.
 * @param {Object} [options]
 * @param {string} [options.r='AC'] - The verdict, such as `AC` or `CE`.
 * @param {number} [options.id=12345678] - The submission ID.
 * @param {number} [options.p=1000] - The problem ID.
 * @returns {string[]} The chunks of the stream, one per event.
 */
export const createJudgeEvents = ({
  r = 'AC',
  id = 12345678,
  p = 1000,
} = {}) => {
  const summary = {
    p,
    id,
    r,
    s: r === 'AC' ? 100 : 0,
    d: 4,
    m: 3456,
    u: 'player',
    l: 'CPP',
    t: 1792900000000,
    c: null,
    i: false,
    b: 140,
    a: 'CPP20',
    ...(r === 'AC' ? {} : { e: 'compile error' }),
  };
  const progress = (status, value) => ({
    type: 'JUDGE_PROGRESS',
    data: {
      p,
      id,
      progress: value,
      r: status,
      u: 'player',
      l: 'CPP',
      a: 'CPP20',
      t: 1792900000000,
      c: null,
      i: false,
    },
  });
  return [
    event('message', { ok: true }),
    event('JUDGE_PROGRESS', progress('CP', 0)),
    event('JUDGE_PROGRESS', progress('RUN', 0.5)),
    event('JUDGE_FINISH', { type: 'JUDGE_FINISH', data: summary }),
    event('result', { success: true, data: { id, submissionId: id, summary } }),
  ];
};
