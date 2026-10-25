/**
 * The judge sites the extension works on.
 *
 * - A required site (`optional: false`), such as Programmers, is in `host_permissions` and
 *   `content_scripts` of manifest.json, so it always works.
 * - An optional site (`optional: true`) is in `optional_host_permissions` only. The user turns
 *   it on in the popup, which asks for its `origins`, and then the background registers its
 *   `contentScripts` (scripts/sitePermissions.js). A new required host would add a permission
 *   warning, and Chrome would disable the extension for existing users until they accept it.
 *
 * `origins` are match patterns of the form `https://<host>/*`.
 * @type {ReadonlyArray<{
 *   id: string,
 *   name: string,
 *   url: string,
 *   optional: boolean,
 *   origins: string[],
 *   contentScripts?: chrome.scripting.RegisteredContentScript[],
 * }>}
 */
export const JUDGE_SITES = Object.freeze([
  Object.freeze({
    id: 'programmers',
    name: 'Programmers',
    url: 'https://school.programmers.co.kr/learn/challenges',
    optional: false,
    origins: Object.freeze([
      'https://school.programmers.co.kr/*',
      'https://programmers.co.kr/*',
    ]),
  }),
  Object.freeze({
    id: 'codeforces',
    name: 'Codeforces',
    url: 'https://codeforces.com/problemset',
    optional: true,
    origins: Object.freeze(['https://codeforces.com/*']),
    contentScripts: Object.freeze([
      Object.freeze({
        id: 'codeforces',
        // The user's submission pages and the status pages, where a verdict is shown.
        matches: [
          'https://codeforces.com/contest/*/submission/*',
          'https://codeforces.com/gym/*/submission/*',
          'https://codeforces.com/problemset/submission/*',
          'https://codeforces.com/contest/*/my',
          'https://codeforces.com/gym/*/my',
          'https://codeforces.com/submissions/*',
        ],
        js: [
          'scripts/content/ui.js',
          'scripts/codeforces/helpers.js',
          'scripts/codeforces/index.js',
        ],
        css: ['scripts/content/ui.css'],
        runAt: 'document_idle',
      }),
    ]),
  }),
  Object.freeze({
    id: 'jungol',
    name: 'JUNGOL',
    url: 'https://jungol.co.kr/problem',
    optional: true,
    origins: Object.freeze(['https://jungol.co.kr/*']),
    // The site changes its pages without loading them, so the scripts run on all of them.
    contentScripts: Object.freeze([
      Object.freeze({
        // In the page's world before the site's scripts, which keep their own reference to
        // `fetch`: it watches the judge request of the problem pages.
        id: 'jungol-judge',
        matches: ['https://jungol.co.kr/*'],
        js: ['scripts/jungol/helpers.js', 'scripts/jungol/judgeWatcher.js'],
        runAt: 'document_start',
        world: 'MAIN',
      }),
      Object.freeze({
        id: 'jungol',
        matches: ['https://jungol.co.kr/*'],
        js: [
          'scripts/content/ui.js',
          'scripts/jungol/helpers.js',
          'scripts/jungol/index.js',
        ],
        css: ['scripts/content/ui.css', 'scripts/jungol/jungol.css'],
        runAt: 'document_idle',
      }),
    ]),
  }),
]);

/**
 * Returns the origin of a match pattern of the form `https://<host>/*`.
 * @param {string} pattern - The match pattern, such as `https://programmers.co.kr/*`.
 * @returns {string} The origin, such as `https://programmers.co.kr`.
 */
export const originOf = (pattern) => pattern.replace(/\/\*$/, '');
