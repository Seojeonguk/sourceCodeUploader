# Privacy Policy

Source Code Uploader is a Chrome extension that uploads your accepted Programmers, Codeforces and JUNGOL solutions to the GitHub repository or Notion database you choose. This policy explains what it reads, where it sends it and what it keeps.

Effective date: 2026-10-22

## What the extension reads

On a Programmers problem page (`programmers.co.kr`, `school.programmers.co.kr`), when you click an upload button, or when the result is correct and you turned on auto upload, the extension reads:

- the source code in the editor,
- the problem number, title, level, category and language.

To find a correct answer for auto upload, it also checks the grading result shown on the page.

On Codeforces (`codeforces.com`), only after you turn it on in the popup and allow the access Chrome asks for, the extension:

- shows the upload buttons on your own accepted submission and reads its code, language and problem;
- reads the problem page for the name, rating and tags;
- with auto upload on, watches your submissions on the status pages (`/contest/<id>/my`, `/submissions/<handle>`) and reads the page of one that becomes accepted, in your browser session.

On JUNGOL (`jungol.co.kr`), only after you turn it on in the popup and allow the access Chrome asks for, the extension:

- watches the request that a problem page sends to the JUNGOL judge (`saet.jungol.co.kr/judge`) when you submit, and reads a copy of its answer for the verdict; it does not change the request or the answer, and reads no other request;
- when the verdict is accepted, keeps the code you sent, its language and the problem number in the page, and shows the upload buttons;
- reads the problem page's data (`/problem/<id>/__data.json`) for the title, tier and tags, in your browser session. It does not read or upload the problem statement.

Turning Codeforces or JUNGOL off, or removing its access in `chrome://extensions`, stops all of this on that site. It reads nothing on other sites.

## Where it sends it

The extension has no server of its own that receives your code. It sends the solution only to the place you choose:

- **GitHub** (`api.github.com`): commits the code as a file to the repository you selected, with your GitHub login.
- **Notion** (`api.notion.com`): creates a page with the problem and the code in the database you selected, with your Notion login.

To log in, it talks to:

- **GitHub** (`github.com`): the device code login of the Source Code Uploader GitHub App. The login reaches only the repositories you installed the App on.
- **Notion OAuth proxy**: a Cloudflare Worker run by the developer ([source](proxy/notion-oauth/src/index.js)), because Notion needs a client secret that cannot be kept in an extension. It receives the Notion authorization code when you log in and the access token when you log out, passes them to Notion to get or revoke the token, and stores and logs nothing. Cloudflare processes the requests as its infrastructure provider, under the [Cloudflare Privacy Policy](https://www.cloudflare.com/privacypolicy/).

GitHub and Notion handle what you upload under their own privacy policies.

## What it keeps

Everything is kept in your browser (`chrome.storage`), not on a server:

- your GitHub access and refresh tokens, when they expire, and your GitHub user name,
- your Notion access token,
- the repository and database you selected,
- whether auto upload is on for GitHub and Notion,
- while you log in, the GitHub device code and the reason the last Notion login failed (cleared when the browser closes).

The tokens are hidden from the scripts that run on the judge sites' pages.

## What it does not do

- No analytics, tracking or ads.
- No selling or sharing of your data, and no use of it for anything other than uploading your solutions.
- No access to repositories you did not install the GitHub App on, or to Notion pages you did not share with it.

## Removing your data

- **Log out** in the popup to remove the login and the selected repository or database. Logging out of Notion also revokes the token. GitHub has no way for an extension to revoke its token, so revoke it at [GitHub › Settings › Applications › Authorized GitHub Apps](https://github.com/settings/apps/authorizations).
- **Remove the extension** to delete everything it kept.
- Files and pages you uploaded stay in your GitHub repository and Notion database until you delete them there.

## Changes

Changes to this policy are published in this file, with a new effective date. The history is in the [repository](https://github.com/Seojeonguk/sourceCodeUploader/commits/master/PRIVACY.md).

## Contact

[Open an issue](https://github.com/Seojeonguk/sourceCodeUploader/issues) on GitHub.
