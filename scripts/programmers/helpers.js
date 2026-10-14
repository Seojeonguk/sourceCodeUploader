/**
 * Pure helpers for the Programmers content script.
 *
 * Content scripts are classic scripts, so this file is loaded before index.js
 * and shares the helpers through `globalThis.SCU_PROGRAMMERS`.
 * The tests load this file with `node:vm`.
 */
(() => {
  const LANGUAGE_EXTENSIONS = Object.freeze({
    c: 'c',
    'c#': 'cs',
    'c++': 'cpp',
    clang: 'c',
    cpp: 'cpp',
    c_cpp: 'cpp',
    csharp: 'cs',
    cs: 'cs',
    go: 'go',
    java: 'java',
    javascript: 'js',
    js: 'js',
    kotlin: 'kt',
    mysql: 'sql',
    oracle: 'sql',
    php: 'php',
    python: 'py',
    python3: 'py',
    py: 'py',
    ruby: 'rb',
    scala: 'scala',
    swift: 'swift',
    typescript: 'ts',
    ts: 'ts',
  });

  // Breadcrumb items that are not problem categories.
  const NON_CATEGORY_BREADCRUMBS = Object.freeze(['코딩테스트 연습']);

  const ACCEPTED_RESULT_TEXT = '정답';

  /**
   * Collapses whitespace and trims the text.
   * @param {?string} value
   * @returns {string}
   */
  const normalizeText = (value) =>
    String(value ?? '')
      .replace(/\s+/g, ' ')
      .trim();

  /**
   * Returns the file extension of a language name, such as `Python3` → `py`.
   * @param {?string} language
   * @returns {?string} The extension, or null if the language is unknown.
   */
  const getExtensionFromLanguage = (language) => {
    const lowerCase = normalizeText(language).toLowerCase();
    const normalized = lowerCase.replace(/[^a-z0-9_+#]/g, '');

    return (
      LANGUAGE_EXTENSIONS[normalized] ?? LANGUAGE_EXTENSIONS[lowerCase] ?? null
    );
  };

  /**
   * Returns the extension of the file shown on the editor tab, such as `solution.py` → `py`.
   * @param {?string} fileLabel
   * @returns {?string} The extension, or null if the label has none.
   */
  const getExtensionFromFileLabel = (fileLabel) => {
    const match = normalizeText(fileLabel).match(/\.([a-z0-9+#]+)$/i);
    return match ? match[1].toLowerCase() : null;
  };

  /**
   * Formats the challenge level, such as `2` → `Lv. 2`.
   * @param {?(string|number)} level
   * @returns {?string} The formatted level, or null if there is no number.
   */
  const formatLevel = (level) => {
    const number = String(level ?? '').match(/\d+/)?.[0];
    return number ? `Lv. ${number}` : null;
  };

  /**
   * Returns the problem categories from the breadcrumb, without the root and the title.
   * @param {string[]} items - The breadcrumb texts.
   * @param {string} title - The problem title.
   * @returns {string[]} The categories.
   */
  const getCategoryTags = (items, title) => {
    const normalizedTitle = normalizeText(title);

    return [
      ...new Set(
        items
          .map(normalizeText)
          .filter(
            (item) =>
              item &&
              item !== normalizedTitle &&
              !NON_CATEGORY_BREADCRUMBS.includes(item),
          ),
      ),
    ];
  };

  // A lesson opens on both hosts. The Notion upload finds the page of a problem by its URL,
  // so the URL always uses this host, and the same problem gets one page.
  const PROBLEM_ORIGIN = 'https://school.programmers.co.kr';

  /**
   * Returns the URL of the problem, on the same host whichever host the page is on.
   * @param {string} pathname - The path of the page, such as `/learn/courses/30/lessons/1845`.
   * @returns {string}
   */
  const toProblemUrl = (pathname) => `${PROBLEM_ORIGIN}${pathname}`;

  /**
   * Checks whether the result title means the submission is accepted.
   * @param {?string} resultText - The title of the result modal, such as `정답입니다.`
   * @returns {boolean}
   */
  const isAcceptedResult = (resultText) =>
    normalizeText(resultText).startsWith(ACCEPTED_RESULT_TEXT);

  globalThis.SCU_PROGRAMMERS = Object.freeze({
    LANGUAGE_EXTENSIONS,
    normalizeText,
    getExtensionFromLanguage,
    getExtensionFromFileLabel,
    formatLevel,
    getCategoryTags,
    isAcceptedResult,
    toProblemUrl,
  });
})();
