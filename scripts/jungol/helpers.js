/**
 * Pure helpers for the JUNGOL scripts.
 *
 * Content scripts are classic scripts, so this file is loaded before judgeWatcher.js (in the
 * page's world) and index.js (in the extension's), and shares the helpers through
 * `globalThis.SCU_JUNGOL`. The tests load this file with `node:vm`.
 */
(() => {
  const ORIGIN = 'https://jungol.co.kr';
  // The page sends the code here and reads the verdict from the answer, a stream of events.
  const JUDGE_URL = 'https://saet.jungol.co.kr/judge';
  // The message from judgeWatcher.js to index.js about an accepted submission.
  const MESSAGE_TYPE = 'SCU_JUNGOL_ACCEPTED';

  // The extensions of the base languages, as the site names them for downloads.
  const LANGUAGE_EXTENSIONS = Object.freeze({
    C: 'c',
    CPP: 'cpp',
    CSHARP: 'cs',
    D: 'd',
    GO: 'go',
    HASKELL: 'hs',
    JAVA: 'java',
    JAVASCRIPT: 'js',
    KOTLIN: 'kt',
    NODE: 'js',
    OCAML: 'ml',
    PASCAL: 'pas',
    PERL: 'pl',
    PHP: 'php',
    PYPY3: 'py',
    PYTHON: 'py',
    PYTHON3: 'py',
    RUBY: 'rb',
    RUST: 'rs',
    SCALA: 'scala',
    SWIFT: 'swift',
    TYPESCRIPT: 'ts',
  });

  /**
   * Reads the judge request that the problem page sends.
   * @param {*} body - The body of the request.
   * @returns {?{
   *   problemId: number, contestId: ?number, language: string, altLanguage: ?string,
   *   sourceCode: string,
   * }} The submission, or null if the body is not one.
   */
  const parseJudgeRequest = (body) => {
    if (typeof body !== 'string') {
      return null;
    }
    let request;
    try {
      request = JSON.parse(body);
    } catch {
      return null;
    }
    if (
      !Number.isInteger(request?.problemId) ||
      typeof request.sourceText !== 'string' ||
      typeof request.language !== 'string'
    ) {
      return null;
    }
    return {
      problemId: request.problemId,
      contestId: Number.isInteger(request.contestId) ? request.contestId : null,
      language: request.language,
      altLanguage:
        typeof request.altLanguage === 'string' ? request.altLanguage : null,
      sourceCode: request.sourceText,
    };
  };

  /**
   * Reads the complete events in the text of an event stream.
   * @param {string} text - The text read so far, starting at an event.
   * @returns {{events: {type: string, data: *}[], rest: string}} The events, with the data
   *   as JSON (or null), and the text of the event that is not complete yet.
   */
  const parseEventStream = (text) => {
    const blocks = text.replace(/\r\n/g, '\n').split('\n\n');
    const rest = blocks.pop();
    const events = blocks
      .filter((block) => block.trim())
      .map((block) => {
        const lines = block.split('\n');
        const type =
          lines
            .find((line) => line.startsWith('event:'))
            ?.slice(6)
            .trim() || 'message';
        const raw = lines
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).replace(/^ /, ''))
          .join('\n');
        let data = null;
        try {
          data = JSON.parse(raw);
        } catch {
          // Not JSON, such as a keep-alive.
        }
        return { type, data };
      });
    return { events, rest };
  };

  /**
   * Whether an event of the judge stream says that the submission is accepted. The verdict
   * is read, not the score, since a submission can have a partial score.
   * @param {{type: string, data: *}} event
   * @returns {boolean}
   */
  const isAcceptedFinish = ({ type, data }) =>
    (type === 'JUDGE_FINISH' || data?.type === 'JUDGE_FINISH') &&
    data?.data?.r === 'AC';

  /**
   * Returns the file extension for a language of JUNGOL.
   * @param {?string} language - The base language, such as `CPP` or `PYTHON3`.
   * @returns {string} The extension, or `txt` if the language is unknown.
   */
  const getExtensionFromLanguage = (language) =>
    LANGUAGE_EXTENSIONS[String(language ?? '').toUpperCase()] ?? 'txt';

  /**
   * Reads a value of a SvelteKit data node: devalue keeps the values in one flat array, and
   * objects and arrays hold the indexes of theirs.
   * @param {Array} values - The flat array.
   * @param {number} index
   * @param {number} [depth=0]
   */
  const readValue = (values, index, depth = 0) => {
    const value = values[index];
    // Negative indexes are undefined, null and other special values; strings first in an
    // array are types such as Date. Neither is needed.
    if (index < 0 || depth > 8 || value === undefined) {
      return null;
    }
    if (Array.isArray(value)) {
      return typeof value[0] === 'string'
        ? null
        : value.map((item) => readValue(values, item, depth + 1));
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          readValue(values, item, depth + 1),
        ]),
      );
    }
    return value;
  };

  /**
   * Reads the problem from the data of a problem page, `/problem/{id}/__data.json`. Only its
   * title, tier and tags are read, not the statement.
   * @param {Object} json - The data of the page.
   * @param {number} problemId
   * @returns {?{title: string, tier: ?string, tags: string[]}}
   */
  const readProblemData = (json, problemId) => {
    const key = `$/problem/${problemId}`;
    const node = (json?.nodes ?? []).find(
      (item) =>
        item?.type === 'data' &&
        Array.isArray(item.data) &&
        Object.hasOwn(item.data[0] ?? {}, key),
    );
    if (!node) {
      return null;
    }

    const root = node.data[0];
    const problem = readValue(node.data, root[key])?.data;
    if (typeof problem?.title !== 'string') {
      return null;
    }
    // The page title is `<title> · <tier>`, such as `두 정수 더하기 (A+B) · Bronze V`.
    const seoTitle = readValue(node.data, root.seo)?.title;
    const tier =
      typeof seoTitle === 'string' && seoTitle.includes(' · ')
        ? seoTitle.slice(seoTitle.lastIndexOf(' · ') + 3).trim()
        : null;
    return {
      title: problem.title,
      tier: tier || null,
      tags: Object.keys(problem)
        .filter((name) => name.startsWith('t:'))
        .map((name) => name.slice(2)),
    };
  };

  /**
   * Formats the tier as the level of the Notion page.
   * @param {?string} tier - Such as `Bronze V`.
   * @returns {?string} The tier, or null for an unranked problem.
   */
  const formatTier = (tier) => (tier && tier !== 'Unranked' ? tier : null);

  globalThis.SCU_JUNGOL = Object.freeze({
    ORIGIN,
    JUDGE_URL,
    MESSAGE_TYPE,
    parseJudgeRequest,
    parseEventStream,
    isAcceptedFinish,
    getExtensionFromLanguage,
    readProblemData,
    formatTier,
  });
})();
