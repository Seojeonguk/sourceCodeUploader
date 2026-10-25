/**
 * The JUNGOL content script, registered when the user turns JUNGOL on in the popup.
 *
 * judgeWatcher.js, in the page's world, tells this script about a submission that the judge
 * accepted on a problem page, with its code. This script then shows the upload buttons in a
 * panel at the bottom left: the site's pages change without loading, and their classes are
 * generated, so the panel is not put inside them.
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
  const { t, createUploadButtons } = globalThis.SCU_CONTENT;

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
    showPanel(event.data.submission);
  });
})();
