# Publishing on the Chrome Web Store

What to fill in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole), and the order to do it in, so the store build can log in to Notion from its first review ([#235](https://github.com/Seojeonguk/sourceCodeUploader/issues/235)).

## Order

1. **Developer account** — register once (one-time US$5 fee) with 2-Step Verification on the Google account, and verify the contact email.
2. **Version** — merge the release PR that bumps `manifest.json` and `package.json` to the store version (`v3.2.0`). Do not tag it yet.
3. **Zip** — run `npm run package`, or download the `chrome-web-store-zip` artifact of the CI run on `master`. It writes `dist/source-code-uploader-<version>.zip` with `manifest.json` without its `key` (the store rejects it and gives the extension its own ID) and only the files the extension loads.
4. **Upload** — **Add new item** and upload the zip. The dashboard shows the store ID of the item right away, before the review.
5. **Notion login for the store ID** — before submitting, so the reviewers can log in to Notion:
   1. Add the store ID to `ALLOWED_EXTENSION_IDS` in `proxy/notion-oauth/wrangler.toml` (comma-separated), in a PR.
   2. Register `https://<store-id>.chromiumapp.org/` as a redirect URI of the Notion integration (<https://www.notion.so/my-integrations> → the integration → **OAuth**).
   3. Deploy the worker: `cd proxy/notion-oauth && npx wrangler deploy`.
   4. To try the zip before submitting, unzip it and load the folder in `chrome://extensions/`. Without the `key` it gets a random ID that the worker does not allow, so everything but the Notion login can be checked this way.
6. **Fill in the tabs** below, then **Submit for review**.
7. **After the approval** — update the installation section of `README.md` and `README.ko.md` with the store link, tag the version, publish the GitHub Release, and close the milestone. Publishing the release runs the **Release zip** workflow (`.github/workflows/release.yml`), which checks that the tag matches `manifest.json`, runs the tests and attaches `source-code-uploader-<version>.zip` to the release.

## Store listing

| Field        | Value                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Name         | Source Code Uploader (from `manifest.json`)                                                                                     |
| Summary      | Uploads your accepted Programmers solutions to GitHub and Notion with one click. (from `manifest.json`, at most 132 characters) |
| Category     | Developer Tools                                                                                                                 |
| Language     | English                                                                                                                         |
| Homepage URL | `https://github.com/Seojeonguk/sourceCodeUploader`                                                                              |
| Support URL  | `https://github.com/Seojeonguk/sourceCodeUploader/issues`                                                                       |

### Description

```text
Keep every Programmers problem you solve, without copying and pasting.

Source Code Uploader adds GitHub and Notion buttons to Programmers problem pages. Click one, and your solution is saved with the problem information:

• GitHub: commits the code as a file named after the problem and language to the repository you choose. If the same code is already there, nothing is committed.
• Notion: creates a page with the problem title, level, category and a code block in the database you choose. Uploading the same problem again updates its code.
• Auto upload: turn it on, and a correct answer is uploaded as soon as it is graded.

How to start
1. Click the extension icon and log in to GitHub (enter the code shown on GitHub) and Notion (choose the pages to share).
2. Install the GitHub App on the repositories to upload to, and share a Notion database with the extension. Any database works: the extension adds the properties it needs.
3. Select the repository and the database in the popup.
4. Solve a problem on Programmers and click the upload button, or turn on auto upload.

Privacy
• Your code goes only to the GitHub repository and Notion database you select. There is no analytics or tracking.
• The GitHub login reaches only the repositories you install the App on.
• Logins are kept in your browser. The Notion client secret stays on a small open-source proxy, not in the extension.

Open source: https://github.com/Seojeonguk/sourceCodeUploader
Requires Chrome 116 or later.
```

### Images

| Image              | Size                                                       | Required   | Source                                                                                                                                                                                                                                                  |
| ------------------ | ---------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Store icon         | 128×128 PNG                                                | Yes        | `icon/icon128.png`                                                                                                                                                                                                                                      |
| Screenshots        | 1280×800 (or 640×400), square corners, no padding, up to 5 | At least 1 | [`docs/store/screenshot-1-upload-buttons.png`](store/screenshot-1-upload-buttons.png), [`docs/store/screenshot-2-github-commit.png`](store/screenshot-2-github-commit.png). Worth adding: the popup with GitHub and Notion selected, the page in Notion |
| Small promo tile   | 440×280                                                    | Yes        | [`docs/store/small-promo-440x280.png`](store/small-promo-440x280.png)                                                                                                                                                                                   |
| Marquee promo tile | 1400×560                                                   | No         | —                                                                                                                                                                                                                                                       |

The images in `docs/store/` were made from the demo recording (the frames cropped onto a background with a caption). Check new screenshots for tokens, private repositories and other people's information before uploading.

## Privacy practices

**Single purpose**

```text
Uploads the user's accepted solutions on Programmers problem pages to the GitHub repository or Notion database the user selects.
```

**Permission justifications**

| Permission       | Justification                                                                                                                                                                                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `identity`       | Opens the Notion OAuth login in a browser window with chrome.identity.launchWebAuthFlow and receives its redirect, so the authorization code never reaches another site.                                                                                                                                                  |
| `storage`        | Keeps the GitHub and Notion logins, the selected repository and database, and the auto upload options in chrome.storage, hidden from content scripts.                                                                                                                                                                     |
| Host permissions | `programmers.co.kr` and `school.programmers.co.kr`: shows the upload buttons on problem pages and reads the solution and the problem information when the user uploads. `github.com`: the GitHub App device code login and its token refresh. `api.notion.com`: creates the problem page in the selected Notion database. |

**Remote code**: No, I am not using remote code. Every script is in the package.

**Data usage** — check only these:

- [x] **Authentication information**: the GitHub and Notion access tokens.
- [x] **Website content**: the solution and the problem information on the Programmers page.

Leave the other types unchecked: personally identifiable information, health, financial and payment, personal communications, location, web history, user activity. (The GitHub user name is used only to call the GitHub API for the selected repository.)

**Certifications** — check all three:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL**: `https://github.com/Seojeonguk/sourceCodeUploader/blob/master/PRIVACY.md`

## Distribution

- Visibility: Public
- Regions: All regions
- Payment: Free

## Test instructions

The dashboard has a **Test instructions** tab for the reviewers:

```text
The extension needs a Programmers account (free) and a GitHub or Notion account of your own; no test account is shared.

1. Click the extension icon → GitHub "Authorize": enter the code shown on github.com/login/device, then install the "Source Code Uploader" GitHub App on a test repository (Add repositories in the popup).
2. Create an empty Notion database, click Notion "Authorize" and share the page with the database. Selecting it in the popup adds the properties the uploads need ("info", "tags", "URL", "Date", "mime").
3. Select the repository and the database in the popup.
4. Open a Programmers problem, for example https://school.programmers.co.kr/learn/courses/30/lessons/12903, write a solution, and click the GitHub or Notion button under the editor. A message shows the link to the uploaded file or page.
```
