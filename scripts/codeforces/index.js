/**
 * The Codeforces content script, registered when the user turns Codeforces on in the popup.
 *
 * - On the user's own accepted submission, upload buttons above the code.
 * - On the status pages (`/contest/<id>/my`, `/submissions/<handle>`), a submission of the user
 *   that becomes accepted while the page is open is uploaded to the platforms with auto upload
 *   on. Its code is read from its submission page.
 */
(() => {
  const TYPE = 'Codeforces';
  // How long to wait after the status table changes before reading it again.
  const STATUS_CHECK_DELAY = 500;

  const {
    ORIGIN,
    formatRating,
    getExtensionFromLanguage,
    getLoggedInHandle,
    parseProblemPage,
    parseProblemPath,
    parseStatusRow,
    parseSubmissionPage,
  } = globalThis.SCU_CODEFORCES;
  const { t, createUploadButtons, getAutoUploadPlatforms, showToast, upload } =
    globalThis.SCU_CONTENT;

  const SUBMISSION_PATH =
    /^\/(?:(?:contest|gym)\/\d+|problemset)\/submission\/(?:\d+\/)?\d+\/?$/;
  const STATUS_PATH = /^\/(?:(?:contest|gym)\/\d+\/my|submissions\/[^/]+)\/?$/;

  /**
   * Reads a page of Codeforces in this tab's session, as the user sees it.
   * @param {string} path - The path of the page.
   * @returns {Promise<Document>}
   */
  const fetchPage = async (path) => {
    const response = await fetch(new URL(path, ORIGIN), {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return new DOMParser().parseFromString(await response.text(), 'text/html');
  };

  /**
   * Reads the name, rating and tags from the problem page. The upload still works with the
   * name from the submission when the page cannot be read.
   * @param {string} problemPath
   * @returns {Promise<{name: ?string, rating: ?number, tags: string[]}>}
   */
  const readProblem = async (problemPath) => {
    try {
      return parseProblemPage(await fetchPage(problemPath));
    } catch (error) {
      // eslint-disable-next-line no-console -- a classic content script cannot import the logger
      console.warn('[SCU] Could not read the problem page.', error);
      return { name: null, rating: null, tags: [] };
    }
  };

  /**
   * Builds the upload payload of an accepted submission.
   * @param {Object} submission - From parseSubmissionPage or parseStatusRow, with `sourceCode`.
   * @returns {Promise<Object>} The payload for the GitHub and Notion uploads.
   */
  const buildPayload = async (submission) => {
    const problem = parseProblemPath(submission.problemPath);
    if (!problem) {
      throw new Error(t('codeforcesProblemNotFound'));
    }
    if (!submission.sourceCode?.trim()) {
      throw new Error(t('sourceCodeNotFound'));
    }

    const { name, rating, tags } = await readProblem(submission.problemPath);
    const title = `${problem.problemId} - ${name || submission.problemName}`;

    return {
      type: TYPE,
      problemId: problem.problemId,
      title,
      extension: getExtensionFromLanguage(submission.language),
      sourceCode: submission.sourceCode,
      // Used by the Notion upload.
      problemInfo: {
        title,
        level: formatRating(rating),
        tags,
        url: problem.url,
      },
    };
  };

  /**
   * Adds the upload buttons above the code of the user's own accepted submission.
   */
  const showSubmissionButtons = () => {
    const submission = parseSubmissionPage(document);
    const source = document.querySelector('#program-source-text');
    const handle = getLoggedInHandle(document);
    if (
      !submission?.accepted ||
      !source ||
      !handle ||
      submission.author.toLowerCase() !== handle.toLowerCase() ||
      document.querySelector('.scu-content-wrapper')
    ) {
      return;
    }

    source.before(createUploadButtons(() => buildPayload(submission)));
  };

  /**
   * Uploads a submission that was just accepted to the platforms with auto upload on.
   * @param {Object} row - From parseStatusRow.
   */
  const uploadAccepted = async (row) => {
    const platforms = await getAutoUploadPlatforms();
    if (platforms.length === 0) {
      return;
    }

    let payload;
    try {
      const page = parseSubmissionPage(await fetchPage(row.submissionPath));
      payload = await buildPayload({
        ...row,
        sourceCode: page?.sourceCode ?? null,
      });
    } catch (error) {
      // Such as the Cloudflare check, which a request outside the tab cannot pass.
      // eslint-disable-next-line no-console -- a classic content script cannot import the logger
      console.warn('[SCU] Could not read the submission.', error);
      showToast(t('codeforcesSubmissionUnreadable'), {
        type: 'error',
        link: new URL(row.submissionPath, ORIGIN).href,
        linkText: t('open'),
      });
      return;
    }

    // Upload one by one so each result message is shown.
    // eslint-disable-next-line no-restricted-syntax -- sequential uploads
    for (const platform of platforms) {
      // eslint-disable-next-line no-await-in-loop -- sequential uploads
      await upload(platform, payload);
    }
  };

  /**
   * Watches the status table, which Codeforces updates while judging, and uploads each
   * submission of the user that turns accepted. Submissions accepted before the page was
   * opened are not uploaded.
   */
  const watchStatusTable = () => {
    const handle = getLoggedInHandle(document)?.toLowerCase();
    if (!handle) {
      return;
    }

    // The submissions that were seen without the accepted verdict, which may still turn it.
    const pending = new Set();
    const uploaded = new Set();
    let checkScheduled = false;

    const check = () => {
      checkScheduled = false;
      document.querySelectorAll('tr[data-submission-id]').forEach((element) => {
        const row = parseStatusRow(element);
        if (row.author.toLowerCase() !== handle || uploaded.has(row.id)) {
          return;
        }
        if (row.verdict !== 'OK' || row.waiting) {
          pending.add(row.id);
          return;
        }
        if (pending.has(row.id) && row.submissionPath) {
          pending.delete(row.id);
          uploaded.add(row.id);
          uploadAccepted(row);
        }
      });
    };

    check();
    const observer = new MutationObserver(() => {
      // The extension was reloaded or removed, so this script can no longer use chrome APIs.
      if (!chrome.runtime?.id) {
        observer.disconnect();
        return;
      }
      if (!checkScheduled) {
        checkScheduled = true;
        window.setTimeout(check, STATUS_CHECK_DELAY);
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['submissionverdict', 'waiting', 'class'],
    });
  };

  const { pathname } = window.location;
  if (SUBMISSION_PATH.test(pathname)) {
    showSubmissionButtons();
  } else if (STATUS_PATH.test(pathname)) {
    watchStatusTable();
  }
})();
