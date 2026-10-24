(() => {
  const PROGRAMMERS_TYPE = 'Programmers';
  const RESPONSE_EVENT = 'SCU_PROGRAMMERS_SOURCE_RESPONSE';
  const REQUEST_EVENT = 'SCU_PROGRAMMERS_SOURCE_REQUEST';

  const SELECTORS = Object.freeze({
    LESSON: '.lesson-content[data-lesson-id], [data-lesson-id]',
    TITLE: [
      '.algorithm-title .challenge-title',
      '.challenge-title',
      '.lesson-title',
      '.algorithm-title',
      'h1',
      'h2',
    ],
    BREADCRUMB_ITEMS: 'ol.breadcrumb > li',
    FILE_LABEL: 'div.editor > ul > li.nav-item > a',
    // The language dropdown button, such as `Python3`.
    LANGUAGE: ['div#tour7 > button', 'select[name*="language"] option:checked'],
    // The title of the result modal shown after "제출 후 채점하기".
    RESULT_TITLE: [
      'div.modal-header > h4',
      '#modal-dialog h4',
      '.modal-header h4',
    ],
  });

  // The delay before checking the result modal after the page changes.
  const RESULT_CHECK_DELAY = 300;

  const {
    formatLevel,
    getCategoryTags,
    getExtensionFromFileLabel,
    getExtensionFromLanguage,
    isAcceptedResult,
    normalizeText,
    toProblemUrl,
  } = globalThis.SCU_PROGRAMMERS;
  const { t, createUploadButtons, getAutoUploadPlatforms, showToast, upload } =
    globalThis.SCU_CONTENT;

  let sourceExtractorReady;

  const ensureSourceExtractor = () => {
    if (sourceExtractorReady) {
      return sourceExtractorReady;
    }

    if (document.querySelector('script[data-scu-programmers-extractor]')) {
      sourceExtractorReady = Promise.resolve();
      return sourceExtractorReady;
    }

    sourceExtractorReady = new Promise((resolve) => {
      const script = document.createElement('script');
      script.dataset.scuProgrammersExtractor = 'true';
      script.src = chrome.runtime.getURL(
        'scripts/programmers/sourceExtractor.js',
      );
      script.async = false;
      script.onload = resolve;
      script.onerror = resolve;
      document.documentElement.appendChild(script);
    });

    return sourceExtractorReady;
  };

  const findEditorContainer = () => {
    const editor = document.querySelector(
      '.monaco-editor, .ace_editor, .CodeMirror, textarea',
    );

    if (!editor) {
      return null;
    }

    return (
      editor.closest('.editor, .code-editor, .challenge-content') ||
      editor.parentElement
    );
  };

  const ensureContainerPositioning = (container) => {
    const { position } = window.getComputedStyle(container);
    if (position === 'static') {
      container.style.position = 'relative';
    }
  };

  const getLesson = () => document.querySelector(SELECTORS.LESSON);

  const getProblemId = () => {
    const lessonId = getLesson()?.dataset.lessonId;
    if (lessonId) {
      return lessonId;
    }

    const match = window.location.pathname.match(/lessons\/([^/?#]+)/);
    return match?.[1] ?? 'unknown';
  };

  const getProblemLevel = () =>
    formatLevel(getLesson()?.dataset.challengeLevel);

  const getProblemUrl = () => toProblemUrl(window.location.pathname);

  const getProblemTags = (title) =>
    getCategoryTags(
      [...document.querySelectorAll(SELECTORS.BREADCRUMB_ITEMS)].map(
        (item) => item.textContent,
      ),
      title,
    );

  const getProblemTitle = () => {
    const title = SELECTORS.TITLE.map((selector) =>
      normalizeText(document.querySelector(selector)?.textContent),
    ).find(Boolean);

    if (title) {
      return title;
    }

    return normalizeText(document.title)
      .replace(/\s*\|\s*programmers.*/i, '')
      .replace(/\s*-\s*programmers.*/i, '');
  };

  const getLanguage = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const queryLanguage = searchParams.get('language');

    if (queryLanguage) {
      return queryLanguage.toLowerCase();
    }

    const selectedLanguage = SELECTORS.LANGUAGE.map((selector) =>
      normalizeText(document.querySelector(selector)?.textContent),
    ).find(Boolean);

    // Unknown languages are not guessed, so the file extension falls back to `txt`.
    return selectedLanguage?.toLowerCase() ?? null;
  };

  const getFileExtension = () =>
    getExtensionFromFileLabel(
      document.querySelector(SELECTORS.FILE_LABEL)?.textContent,
    ) ??
    getExtensionFromLanguage(getLanguage()) ??
    'txt';

  const getTextareaSourceCode = () => {
    const textareas = [...document.querySelectorAll('textarea')];
    const textarea = textareas.find((element) => element.value.trim());
    return textarea?.value ?? '';
  };

  const requestSourceCodeFromPage = async () => {
    await ensureSourceExtractor();

    return new Promise((resolve) => {
      const requestId = `${Date.now()}-${Math.random()}`;
      const timeoutId = window.setTimeout(() => {
        window.removeEventListener('message', handleResponse);
        resolve(getTextareaSourceCode());
      }, 1200);

      function handleResponse(event) {
        if (
          event.source !== window ||
          event.data?.type !== RESPONSE_EVENT ||
          event.data?.requestId !== requestId
        ) {
          return;
        }

        window.clearTimeout(timeoutId);
        window.removeEventListener('message', handleResponse);
        resolve(event.data.sourceCode || getTextareaSourceCode());
      }

      window.addEventListener('message', handleResponse);

      window.postMessage(
        { type: REQUEST_EVENT, requestId },
        window.location.origin,
      );
    });
  };

  const buildPayload = async () => {
    const sourceCode = await requestSourceCodeFromPage();

    if (!sourceCode.trim()) {
      throw new Error(t('sourceCodeNotFound'));
    }

    const problemId = getProblemId();
    const title = getProblemTitle() || problemId;

    return {
      extension: getFileExtension(),
      problemId,
      sourceCode,
      title,
      type: PROGRAMMERS_TYPE,
      // Used by the Notion upload.
      problemInfo: {
        title,
        level: getProblemLevel(),
        tags: getProblemTags(title),
        url: getProblemUrl(),
      },
    };
  };

  const getResultTitle = () =>
    SELECTORS.RESULT_TITLE.map((selector) =>
      document.querySelector(selector),
    ).find(Boolean);

  // A closed modal can stay in the DOM, so check whether it is actually rendered.
  const isRendered = (element) =>
    Boolean(
      element &&
        (element.offsetWidth ||
          element.offsetHeight ||
          element.getClientRects().length),
    );

  const uploadAutomatically = async () => {
    const platforms = await getAutoUploadPlatforms();
    if (platforms.length === 0) {
      return;
    }

    let payload;
    try {
      payload = await buildPayload();
    } catch (error) {
      // eslint-disable-next-line no-console -- a classic content script cannot import the logger
      console.error('[SCU]', error);
      showToast(error.message, { type: 'error' });
      return;
    }

    // Upload one by one so each result message is shown.
    // eslint-disable-next-line no-restricted-syntax -- sequential uploads
    for (const platform of platforms) {
      const button = document.querySelector(
        `.scu-programmers-wrapper [data-platform="${platform.id}"]`,
      );

      // A disabled button is already uploading after a click.
      if (button && !button.disabled) {
        button.disabled = true;
        try {
          // eslint-disable-next-line no-await-in-loop -- sequential uploads
          await upload(platform, payload);
        } finally {
          button.disabled = false;
        }
      }
    }
  };

  /**
   * Watches the result modal and uploads once per accepted result.
   * The check is re-armed after the modal is closed, so re-submissions are also uploaded.
   */
  const watchAcceptedResult = () => {
    let handled = false;
    let checkScheduled = false;

    const checkResult = () => {
      checkScheduled = false;

      const resultTitle = getResultTitle();
      if (!isRendered(resultTitle)) {
        handled = false;
        return;
      }

      if (handled || !isAcceptedResult(resultTitle.textContent)) {
        return;
      }

      handled = true;
      uploadAutomatically();
    };

    // Check only when the page changes, instead of polling all the time.
    const observer = new MutationObserver(() => {
      // The extension was reloaded or removed, so this script can no longer use chrome APIs.
      if (!chrome.runtime?.id) {
        observer.disconnect();
        return;
      }

      // The editor changes the DOM on every key stroke, so check at most once per delay.
      // A timer (not requestAnimationFrame) also runs while the tab is in the background.
      if (!checkScheduled) {
        checkScheduled = true;
        window.setTimeout(checkResult, RESULT_CHECK_DELAY);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
  };

  const initialize = () => {
    if (document.querySelector('.scu-programmers-wrapper')) {
      return true;
    }

    const container = findEditorContainer();
    if (!container) {
      return false;
    }

    ensureContainerPositioning(container);

    // The shared buttons, placed over the editor.
    const wrapper = createUploadButtons(buildPayload);
    wrapper.classList.add('scu-programmers-wrapper');
    container.appendChild(wrapper);

    return true;
  };

  ensureSourceExtractor();
  watchAcceptedResult();

  if (!initialize()) {
    const observer = new MutationObserver(() => {
      if (initialize()) {
        observer.disconnect();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
})();
