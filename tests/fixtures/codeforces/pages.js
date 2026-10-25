import { readFileSync } from 'node:fs';

import { JSDOM } from 'jsdom';

const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');

// An excerpt of a real problem page, with the title and the tags (rating *1300).
export const PROBLEM_HTML = read('./problem.html');

// An excerpt of the real page of problem 339B, the problem of the saved submissions.
export const PROBLEM_339B_HTML = read('./problem-339B.html');

// A real row of a status table: tourist's accepted submission 395033187.
export const STATUS_ROW_HTML = read('./status-row.html');

/**
 * Real submission pages, saved in a logged-in browser: the same accepted submission of 339B
 * opened from the contest and from the problemset, and a rejected one in the gym.
 */
export const SUBMISSION_HTML = Object.freeze({
  contest: read('./submission-contest.html'),
  problemset: read('./submission-problemset.html'),
  gym: read('./submission-gym.html'),
});

// The code of those submissions as it was sent, to compare with what the pages give.
// Git may check the files out with CRLF on Windows, while the pages give LF.
export const SUBMISSION_SOURCE = Object.freeze({
  contest: read('./submission-339B.cpp').replaceAll('\r\n', '\n'),
  gym: read('./submission-106556A.cpp').replaceAll('\r\n', '\n'),
});

const STATUS_HTML = read('./status-my.html');

/**
 * Changes a real page and serializes it again.
 * @param {string} html - The page.
 * @param {(document: Document) => void} change - Changes the page.
 */
const edit = (html, change) => {
  const { document } = new JSDOM(html).window;
  change(document);
  return `<!doctype html>\n${document.documentElement.outerHTML}`;
};

/**
 * Sets the handle in the header. Without a handle, the header has the links to log in, as
 * Codeforces shows them (reconstructed: the saved pages are logged in).
 */
const setHeaderHandle = (document, handle) => {
  const link = document.querySelector('.lang-chooser a[href^="/profile/"]');
  if (handle === null) {
    link.parentElement.innerHTML =
      '<a href="/enter">Enter</a> | <a href="/register">Register</a>';
    return;
  }
  link.href = `/profile/${handle}`;
  link.textContent = handle;
};

const setAuthor = (row, author) => {
  const link = row.querySelector('a[href^="/profile/"]');
  link.href = `/profile/${author}`;
  link.textContent = author;
};

/**
 * The real accepted submission page of 339B from the contest, with some parts changed.
 * @param {Object} [options]
 * @param {?string} [options.handle] - The logged-in handle, or null when no one is logged in.
 * @param {string} [options.author] - The author of the submission.
 * @param {string} [options.verdict='OK'] - Anything else shows the rejected verdict of the
 *   real gym page.
 * @param {?string} [options.sourceCode] - The HTML of the code, or null for a page without it.
 */
export const createSubmissionHtml = ({
  handle = 'seojeonguk',
  author,
  verdict = 'OK',
  sourceCode,
} = {}) =>
  edit(SUBMISSION_HTML.contest, (document) => {
    setHeaderHandle(document, handle);
    const row = document.querySelector('.datatable tr.highlighted-row');
    if (author !== undefined) {
      setAuthor(row, author);
    }
    if (verdict !== 'OK') {
      row.querySelector('.verdict-accepted').outerHTML =
        '<span class="verdict-rejected">Wrong answer on test <span class="verdict-format-judged">1</span></span>';
    }
    const source = document.querySelector('#program-source-text');
    if (sourceCode === null) {
      source.remove();
    } else if (sourceCode !== undefined) {
      source.innerHTML = sourceCode;
    }
  });

/**
 * The real status page `/contest/339/my` with the user's submission, by default while it is
 * judged. The waiting verdict cell is reconstructed: the saved page has only judged rows.
 * @param {Object} [options]
 * @param {string} [options.author] - The author of the submission.
 * @param {?string} [options.verdict] - `OK` for the real accepted row, null while judging.
 * @param {boolean} [options.waiting=true]
 */
export const createStatusHtml = ({
  author,
  verdict = null,
  waiting = true,
} = {}) =>
  edit(STATUS_HTML, (document) => {
    const row = document.querySelector('tr[data-submission-id]');
    if (author !== undefined) {
      setAuthor(row, author);
    }
    const cell = row.querySelector('.status-verdict-cell');
    cell.setAttribute('waiting', String(waiting));
    if (verdict === null) {
      cell.innerHTML = '<span class="verdict-waiting">Running on test 2</span>';
    }
  });

// What Codeforces answers to a request that does not pass its Cloudflare check.
export const CHALLENGE_HTML =
  '<!doctype html><html><head><title>Just a moment...</title></head><body></body></html>';
