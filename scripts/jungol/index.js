/**
 * The JUNGOL content script, registered when the user turns JUNGOL on in the popup.
 *
 * judgeWatcher.js, in the page's world, tells this script about a submission that the judge
 * accepted on a problem page, with its code. This script then shows the upload buttons in a
 * panel at the bottom left: the site's pages change without loading, and their classes are
 * generated, so the panel is not put inside them. With auto upload on, the submission is also
 * uploaded once without a click.
 */
(() => {
  const TYPE = 'JUNGOL';
  const {
    ORIGIN,
    MESSAGE_TYPE,
    formatTier,
    getExtensionFromLanguage,
    readProblemData,
  } = globalThis.SCU_JUNGOL;
  const { t, createUploadButtons, getAutoUploadPlatforms, showToast, upload } =
    globalThis.SCU_CONTENT;

  // The submissions uploaded automatically, so one that is told about again is not.
  const autoUploaded = new Set();

  /**
   * Reads the title, tier and tags from the data of the problem page, in this tab's session.
   * The upload still works with the problem ID when it cannot be read, such as for a problem
   * of a contest that is not public.
   * @param {number} problemId
   * @returns {Promise<?{title: string, tier: ?string, tags: string[]}>}
   */
  const readProblem = async (problemId) => {
    try {
      const response = await fetch(
        `${ORIGIN}/problem/${problemId}/__data.json`,
        {
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return readProblemData(await response.json(), problemId);
    } catch (error) {
      // eslint-disable-next-line no-console -- a classic content script cannot import the logger
      console.warn('[SCU] Could not read the problem page.', error);
      return null;
    }
  };

  /**
   * Builds the upload payload of an accepted submission.
   * @param {Object} submission - From judgeWatcher.js.
   * @returns {Promise<Object>} The payload for the GitHub and Notion uploads.
   */
  const buildPayload = async (submission) => {
    const problemId = String(submission.problemId);
    const problem = await readProblem(submission.problemId);
    const title = problem ? `${problemId} - ${problem.title}` : problemId;

    return {
      type: TYPE,
      problemId,
      title,
      extension: getExtensionFromLanguage(submission.language),
      sourceCode: submission.sourceCode,
      // Used by the Notion upload.
      problemInfo: {
        title,
        level: formatTier(problem?.tier),
        tags: problem?.tags ?? [],
        url: `${ORIGIN}/problem/${problemId}`,
      },
    };
  };

  /**
   * Shows the panel with the upload buttons of the submission, in place of an earlier one.
   * @param {Object} submission
   * @returns {HTMLDivElement} The panel.
   */
  const showPanel = (submission) => {
    document.querySelector('.scu-jungol-panel')?.remove();

    const label = t('jungolAccepted', submission.problemId);
    const panel = document.createElement('div');
    panel.className = 'scu-jungol-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', label);

    const text = document.createElement('span');
    text.className = 'scu-jungol-label';
    text.textContent = label;

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'scu-jungol-close';
    close.title = t('close');
    close.setAttribute('aria-label', t('close'));
    close.textContent = '×';
    close.addEventListener('click', () => panel.remove());

    panel.append(
      text,
      createUploadButtons(() => buildPayload(submission)),
      close,
    );
    document.body.appendChild(panel);
    return panel;
  };

  /**
   * Uploads an accepted submission once to the platforms with auto upload on. Only the
   * submissions judged while the page is open are told about, so earlier ones are left alone.
   * @param {Object} submission
   * @param {HTMLDivElement} panel - The panel of the submission.
   */
  const uploadAutomatically = async (submission, panel) => {
    const key =
      submission.submissionId ||
      `${submission.problemId}\n${submission.sourceCode}`;
    if (autoUploaded.has(key)) {
      return;
    }
    autoUploaded.add(key);

    const platforms = await getAutoUploadPlatforms();
    if (platforms.length === 0) {
      return;
    }

    let payload;
    try {
      payload = await buildPayload(submission);
    } catch (error) {
      // eslint-disable-next-line no-console -- a classic content script cannot import the logger
      console.error('[SCU]', error);
      showToast(error.message, { type: 'error' });
      return;
    }

    // Upload one by one so each result message is shown.
    // eslint-disable-next-line no-restricted-syntax -- sequential uploads
    for (const platform of platforms) {
      const button = panel.querySelector(`[data-platform="${platform.id}"]`);

      // A disabled button is already uploading after a click. A closed panel still uploads.
      if (!button?.disabled) {
        if (button) {
          button.disabled = true;
        }
        try {
          // eslint-disable-next-line no-await-in-loop -- sequential uploads
          await upload(platform, payload);
        } finally {
          if (button) {
            button.disabled = false;
          }
        }
      }
    }
  };

  // Any script of the page can post a message, so only a well-formed submission is taken.
  const isSubmission = (submission) =>
    Number.isInteger(submission?.problemId) &&
    submission.problemId > 0 &&
    typeof submission.sourceCode === 'string' &&
    submission.sourceCode.trim() !== '' &&
    typeof submission.language === 'string';

  window.addEventListener('message', (event) => {
    if (
      event.source !== window ||
      event.origin !== ORIGIN ||
      event.data?.type !== MESSAGE_TYPE ||
      !isSubmission(event.data.submission)
    ) {
      return;
    }
    const { submission } = event.data;
    uploadAutomatically(submission, showPanel(submission));
  });
})();
