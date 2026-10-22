import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');

// An excerpt of a real problem page, with the title and the tags (rating *1300).
export const PROBLEM_HTML = read('./problem.html');

// A real row of a status table: tourist's accepted submission 395033187.
export const STATUS_ROW_HTML = read('./status-row.html');

/**
 * The header of a page, with the handle of the logged-in user, as Codeforces shows it.
 * @param {?string} handle - The logged-in handle, or null when no one is logged in.
 */
const header = (handle) => `
  <div class="lang-chooser">
    <div style="text-align: right;"><a href="?locale=en"><img alt="In English"></a></div>
    <div>${
      handle
        ? `<a href="/profile/${handle}">${handle}</a> | <a href="/abc/logout">Logout</a>`
        : '<a href="/enter">Enter</a> | <a href="/register">Register</a>'
    }</div>
  </div>`;

/**
 * A submission page, such as `/contest/1850/submission/215000000`. It is behind the Cloudflare
 * check outside a browser, so it is built from the markup that Codeforces uses and that other
 * extensions read: a `.datatable` table about the submission and `pre#program-source-text`.
 */
export const createSubmissionHtml = ({
  handle = 'seojeonguk',
  author = 'seojeonguk',
  verdict = 'OK',
  language = 'GNU C++17',
  problemHref = '/contest/1850/problem/F',
  problemText = '1850F - We Were Both Children',
  sourceCode = 'int main() { return 0; }',
} = {}) => `<!doctype html>
<html><head><title>Submission #215000000 - Codeforces</title></head><body>
  ${header(handle)}
  <div class="datatable"><table>
    <tr>
      <th>#</th><th>Author</th><th>Problem</th><th>Lang</th><th>Verdict</th>
      <th>Time</th><th>Memory</th><th>Sent</th><th>Judged</th>
    </tr>
    <tr>
      <td>215000000</td>
      <td><a href="/profile/${author}" class="rated-user user-blue">${author}</a></td>
      <td><a href="${problemHref}">${problemText}</a></td>
      <td>${language}</td>
      <td><span class="submissionVerdictWrapper" submissionId="215000000" submissionVerdict="${verdict}">${
        verdict === 'OK'
          ? "<span class='verdict-accepted'>Accepted</span>"
          : "<span class='verdict-rejected'>Wrong answer on test 3</span>"
      }</span></td>
      <td>46 ms</td><td>0 KB</td><td>2026-10-22 10:00</td><td>2026-10-22 10:00</td>
    </tr>
  </table></div>
  ${
    sourceCode === null
      ? ''
      : `<pre id="program-source-text" class="prettyprint lang-cpp linenums program-source">${sourceCode}</pre>`
  }
</body></html>`;

/**
 * A status page, such as `/contest/1850/my`, with one row of the user's submission.
 */
export const createStatusHtml = ({
  handle = 'seojeonguk',
  author = 'seojeonguk',
  verdict = null,
  waiting = true,
} = {}) => `<!doctype html>
<html><head><title>My submissions - Codeforces</title></head><body>
  ${header(handle)}
  <div class="datatable"><table class="status-frame-datatable"><tbody>
    <tr data-submission-id="215000000" partyMemberIds=";1;">
      <td class="id-cell"><a class="view-source" href="/contest/1850/submission/215000000" submissionId="215000000">215000000</a></td>
      <td class="status-small"><span class="format-time">Oct/22/2026 10:00</span></td>
      <td class="status-party-cell"><a href="/profile/${author}" class="rated-user">${author}</a></td>
      <td class="status-small"><a href="/contest/1850/problem/F">F - We Were Both Children</a></td>
      <td>GNU C++17</td>
      <td class="status-cell status-small status-verdict-cell" submissionId="215000000" waiting="${waiting}">${
        verdict
          ? `<span class="submissionVerdictWrapper" submissionId="215000000" submissionVerdict="${verdict}"><span class='verdict-accepted'>Accepted</span></span>`
          : '<span class="verdict-waiting">Running on test 2</span>'
      }</td>
    </tr>
  </tbody></table></div>
</body></html>`;

// What Codeforces answers to a request that does not pass its Cloudflare check.
export const CHALLENGE_HTML =
  '<!doctype html><html><head><title>Just a moment...</title></head><body></body></html>';
