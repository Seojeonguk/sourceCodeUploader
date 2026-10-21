/**
 * The judge sites the extension works on, as the popup lists them.
 * New sites (#236), such as Codeforces and JUNGOL, are added here, with the permissions they
 * ask for when the user turns them on (#259).
 */
export const JUDGE_SITES = Object.freeze([
  Object.freeze({
    id: 'programmers',
    name: 'Programmers',
    url: 'https://school.programmers.co.kr/learn/challenges',
  }),
]);
