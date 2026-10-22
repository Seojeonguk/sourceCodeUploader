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
]);

/**
 * Returns the origin of a match pattern of the form `https://<host>/*`.
 * @param {string} pattern - The match pattern, such as `https://programmers.co.kr/*`.
 * @returns {string} The origin, such as `https://programmers.co.kr`.
 */
export const originOf = (pattern) => pattern.replace(/\/\*$/, '');
