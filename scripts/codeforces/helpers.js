/**
 * Pure helpers for the Codeforces content script.
 *
 * Content scripts are classic scripts, so this file is loaded before index.js
 * and shares the helpers through `globalThis.SCU_CODEFORCES`.
 * The tests load this file with `node:vm`.
 */
(() => {
  const ORIGIN = 'https://codeforces.com';

  // The language names of Codeforces, such as `C++23 (GCC 14-64, msys2)` or `PyPy 3-64`,
  // matched in order: JavaScript before Java, C++ and C# before C.
  const LANGUAGE_EXTENSIONS = Object.freeze([
    [/javascript|node\.?js/i, 'js'],
    [/typescript/i, 'ts'],
    [/java/i, 'java'],
    [/kotlin/i, 'kt'],
    [/c\+\+|g\+\+|clang\+\+/i, 'cpp'],
    [/c#|\.net|mono/i, 'cs'],
    [/python|pypy/i, 'py'],
    [/rust/i, 'rs'],
    [/^go\b/i, 'go'],
    [/ruby/i, 'rb'],
    [/php/i, 'php'],
    [/scala/i, 'scala'],
    [/swift/i, 'swift'],
    [/haskell/i, 'hs'],
    [/ocaml/i, 'ml'],
    [/perl/i, 'pl'],
    [/pascal|delphi/i, 'pas'],
    [/^d\b|\bdmd\b|\bldc\b/i, 'd'],
    [/\bc\b|gcc c|c11|c17/i, 'c'],
  ]);

  /**
   * Collapses whitespace and trims a text from the page.
   * @param {?string} text
   * @returns {string}
   */
  const normalizeText = (text) =>
    String(text ?? '')
      .replace(/\s+/g, ' ')
      .trim();

  /**
   * Returns the file extension for a Codeforces language name.
   * @param {?string} language - Such as `GNU G++20 13.2 (64 bit, winlibs)`.
   * @returns {string} The extension, or `txt` if the language is unknown.
   */
  const getExtensionFromLanguage = (language) => {
    const name = normalizeText(language);
    return (
      LANGUAGE_EXTENSIONS.find(([pattern]) => pattern.test(name))?.[1] ?? 'txt'
    );
  };

  /**
   * Reads the contest and the problem from a problem link or page path.
   * The problemset and the contest pages show the same problem, so both give one URL, which
   * the Notion upload uses to find a problem that was already uploaded.
   * @param {string} path - Such as `/contest/1850/problem/F`, `/problemset/problem/1850/F`
   *   or `/gym/104114/problem/A`.
   * @returns {?{contestId: string, index: string, problemId: string, url: string}}
   */
  const parseProblemPath = (path) => {
    const match =
      /^\/(contest|gym)\/(\d+)\/problem\/([A-Za-z0-9]+)/.exec(path) ??
      /^\/problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/.exec(path);
    if (!match) {
      return null;
    }

    const [kind, contestId, index] =
      match.length === 4 ? match.slice(1) : ['contest', ...match.slice(1)];
    return {
      contestId,
      index: index.toUpperCase(),
      problemId: `${contestId}${index.toUpperCase()}`,
      url: `${ORIGIN}/${kind}/${contestId}/problem/${index.toUpperCase()}`,
    };
  };

  /**
   * Reads the problem name from a problem link, such as `1850F - We Were Both Children` or
   * `F - We Were Both Children`.
   * @param {?string} text - The link text.
   * @returns {string}
   */
  const getProblemNameFromLink = (text) =>
    normalizeText(text).replace(/^[0-9]*[A-Za-z][0-9]*\s+-\s+/, '');

  /**
   * Reads the problem page: its name, rating and tags.
   * @param {Document} doc - The problem page.
   * @returns {{name: string, rating: ?number, tags: string[]}}
   */
  const parseProblemPage = (doc) => {
    const title = normalizeText(
      doc.querySelector('.problem-statement .header .title')?.textContent,
    );
    const tagBoxes = [...doc.querySelectorAll('.tag-box')];
    const ratingBox = tagBoxes.find(
      (box) => box.getAttribute('title') === 'Difficulty',
    );
    const rating = Number(
      normalizeText(ratingBox?.textContent).replace('*', ''),
    );

    return {
      // `F. We Were Both Children`
      name: title.replace(/^[A-Za-z0-9]+\.\s*/, ''),
      rating: Number.isFinite(rating) && rating > 0 ? rating : null,
      tags: tagBoxes
        .filter((box) => box !== ratingBox)
        .map((box) => normalizeText(box.textContent))
        .filter(Boolean),
    };
  };

  /**
   * Returns the handle of the logged-in user from the page header.
   * @param {Document} doc
   * @returns {?string} The handle, or null if no one is logged in.
   */
  const getLoggedInHandle = (doc) => {
    const link = doc.querySelector('.lang-chooser a[href^="/profile/"]');
    return link ? normalizeText(link.textContent) : null;
  };

  /**
   * Reads the code of a submission. The page runs prettify on it, which puts each line in an
   * `<li>` of `ol.linenums`, so the lines are joined again; the page read with fetch is not
   * prettified yet and keeps them in its text.
   * @param {Element} source - `pre#program-source-text`.
   * @returns {string}
   */
  const readSourceCode = (source) => {
    const lines = source.querySelectorAll('ol.linenums > li');
    return lines.length > 0
      ? [...lines].map((line) => line.textContent).join('\n')
      : source.textContent;
  };

  /**
   * Reads a submission page: the table about the submission and the source code.
   * @param {Document} doc - The page of one submission, such as `/contest/1850/submission/1`.
   * @returns {?{
   *   author: string, language: string, accepted: boolean, problemPath: string,
   *   problemName: string, sourceCode: ?string,
   * }} The submission, or null if the page has no submission table.
   */
  const parseSubmissionPage = (doc) => {
    const problemLink = doc.querySelector('.datatable a[href*="/problem/"]');
    const row = problemLink?.closest('tr');
    if (!row) {
      return null;
    }

    const headers = [...row.closest('table').querySelectorAll('th')].map((th) =>
      normalizeText(th.textContent).toLowerCase(),
    );
    const cells = [...row.children];
    const cellOf = (name) => cells[headers.indexOf(name)];

    const verdict = row.querySelector(
      '[submissionVerdict], [submissionverdict]',
    );
    const source = doc.querySelector('#program-source-text');

    return {
      author: normalizeText(
        row.querySelector('a[href^="/profile/"]')?.textContent,
      ),
      language: normalizeText(cellOf('lang')?.textContent),
      accepted:
        verdict?.getAttribute('submissionVerdict') === 'OK' ||
        Boolean(row.querySelector('.verdict-accepted')),
      problemPath: new URL(problemLink.getAttribute('href'), ORIGIN).pathname,
      // The link shows only the ID, such as `339B`; its title has the name.
      problemName: getProblemNameFromLink(
        problemLink.getAttribute('title') || problemLink.textContent,
      ),
      sourceCode: source ? readSourceCode(source) : null,
    };
  };

  /**
   * Reads a row of a status table, such as on `/contest/1850/my` or `/submissions/<handle>`.
   * @param {HTMLTableRowElement} row - A row with `data-submission-id`.
   * @returns {{
   *   id: string, author: string, verdict: ?string, waiting: boolean,
   *   submissionPath: ?string, problemPath: ?string, problemName: string, language: string,
   * }}
   */
  const parseStatusRow = (row) => {
    const verdictCell = row.querySelector('.status-verdict-cell');
    const verdict = row.querySelector('.submissionVerdictWrapper');
    const problemLink = row.querySelector('a[href*="/problem/"]');
    const cells = [...row.children];
    const problemCell = problemLink?.closest('td');

    return {
      id: row.getAttribute('data-submission-id'),
      author: normalizeText(
        row.querySelector('a[href^="/profile/"]')?.textContent,
      ),
      verdict: verdict?.getAttribute('submissionVerdict') ?? null,
      waiting: verdictCell?.getAttribute('waiting') === 'true',
      submissionPath:
        row.querySelector('a.view-source')?.getAttribute('href') ?? null,
      problemPath: problemLink
        ? new URL(problemLink.getAttribute('href'), ORIGIN).pathname
        : null,
      problemName: getProblemNameFromLink(problemLink?.textContent),
      // The language is the cell after the problem.
      language: normalizeText(
        cells[cells.indexOf(problemCell) + 1]?.textContent,
      ),
    };
  };

  /**
   * Formats the rating as the level of the Notion page.
   * @param {?number} rating
   * @returns {?string} Such as `Rating 1300`, or null without a rating.
   */
  const formatRating = (rating) => (rating ? `Rating ${rating}` : null);

  globalThis.SCU_CODEFORCES = Object.freeze({
    ORIGIN,
    normalizeText,
    getExtensionFromLanguage,
    parseProblemPath,
    getProblemNameFromLink,
    parseProblemPage,
    getLoggedInHandle,
    parseSubmissionPage,
    parseStatusRow,
    formatRating,
  });
})();
