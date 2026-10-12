(() => {
  const PROGRAMMERS_TYPE = 'Programmers';
  const RESPONSE_EVENT = 'SCU_PROGRAMMERS_SOURCE_RESPONSE';
  const REQUEST_EVENT = 'SCU_PROGRAMMERS_SOURCE_REQUEST';
  const TOAST_DURATION = 5000;

  const PLATFORMS = Object.freeze([
    {
      id: 'github',
      name: 'GitHub',
      action: 'commit',
      icon: 'icon/githubIcon.png',
    },
    {
      id: 'notion',
      name: 'Notion',
      action: 'upload',
      icon: 'icon/notionIcon.png',
    },
  ]);

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
    // The title of the result modal shown after "제출 후 채점하기".
    RESULT_TITLE: [
      'div.modal-header > h4',
      '#modal-dialog h4',
      '.modal-header h4',
    ],
  });

  const RESULT_CHECK_INTERVAL = 1000;

  const {
    formatLevel,
    getCategoryTags,
    getExtensionFromFileLabel,
    getExtensionFromLanguage,
    isAcceptedResult,
    normalizeText,
  } = globalThis.SCU_PROGRAMMERS;

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

  const sendUploadMessage = ({ id, action }, payload) =>
    new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          platform: id,
          action,
          payload,
        },
        (response) => resolve(response),
      );
    });

  const createUploadButton = ({ id, name, icon }) => {
    const button = document.createElement('button');
    button.className = 'scu-programmers-upload';
    button.type = 'button';
    button.title = `Upload to ${name}`;
    button.dataset.platform = id;

    const image = document.createElement('img');
    image.src = chrome.runtime.getURL(icon);
    image.alt = name;

    button.appendChild(image);
    return button;
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

  const getProblemUrl = () =>
    `${window.location.origin}${window.location.pathname}`;

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

    const selectedLanguage = [
      '[class*="language"] .active',
      '[class*="Language"] .active',
      '[aria-selected="true"]',
      'select[name*="language"] option:checked',
    ]
      .map((selector) =>
        normalizeText(document.querySelector(selector)?.textContent),
      )
      .find(Boolean);

    return selectedLanguage?.toLowerCase() ?? 'javascript';
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
      throw new Error('Source code not found.');
    }

    const problemId = getProblemId();
    const title = getProblemTitle() || problemId;

    return {
      extension: getFileExtension(),
      problemId,
      sourceCode,
      title,
      type: PROGRAMMERS_TYPE,
      // Used by the Notion upload instead of looking the problem up on solved.ac.
      problemInfo: {
        title,
        level: getProblemLevel(),
        tags: getProblemTags(title),
        url: getProblemUrl(),
      },
    };
  };

  /**
   * Shows a message on the page instead of alert().
   * @param {string} message - The message to show.
   * @param {Object} [options]
   * @param {'info'|'success'|'error'} [options.type='info'] - The type of the message.
   * @param {?string} [options.link] - A URL to open from the message.
   */
  const getToastContainer = () => {
    let container = document.querySelector('.scu-programmers-toasts');

    if (!container) {
      container = document.createElement('div');
      container.className = 'scu-programmers-toasts';
      document.body.appendChild(container);
    }

    return container;
  };

  const showToast = (message, { type = 'info', link = null } = {}) => {
    const toast = document.createElement('div');
    toast.className = `scu-programmers-toast scu-programmers-toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.textContent = message || 'Something went wrong.';

    if (link) {
      const anchor = document.createElement('a');
      anchor.href = link;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = 'Open';
      toast.append(' ', anchor);
    }

    getToastContainer().appendChild(toast);
    window.setTimeout(() => toast.remove(), TOAST_DURATION);
  };

  const showUploadResult = (platformName, response) => {
    if (!response?.ok) {
      showToast(response?.message, { type: 'error' });
      return;
    }

    const link = /^https?:\/\//.test(response.message)
      ? response.message
      : null;
    showToast(`Uploaded to ${platformName}.`, { type: 'success', link });
  };

  const handleUploadClick = async (button, platform) => {
    button.disabled = true;

    try {
      const payload = await buildPayload();
      const response = await sendUploadMessage(platform, payload);
      showUploadResult(platform.name, response);
    } catch (error) {
      // eslint-disable-next-line no-console -- a classic content script cannot import the logger
      console.error('[SCU]', error);
      showToast(error.message, { type: 'error' });
    } finally {
      button.disabled = false;
    }
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

  const getAutoUploadPlatforms = async () => {
    const keys = PLATFORMS.map(({ id }) => `${id}AutoUpload`);
    const options = await chrome.storage.local.get(keys);

    return PLATFORMS.filter(({ id }) => options[`${id}AutoUpload`]);
  };

  const uploadAutomatically = async () => {
    const platforms = await getAutoUploadPlatforms();

    // Upload one by one so each result message is shown.
    // eslint-disable-next-line no-restricted-syntax -- sequential uploads
    for (const platform of platforms) {
      const button = document.querySelector(
        `.scu-programmers-upload[data-platform="${platform.id}"]`,
      );

      if (button && !button.disabled) {
        // eslint-disable-next-line no-await-in-loop -- sequential uploads
        await handleUploadClick(button, platform);
      }
    }
  };

  /**
   * Watches the result modal and uploads once per accepted result.
   * The check is re-armed after the modal is closed, so re-submissions are also uploaded.
   */
  const watchAcceptedResult = () => {
    let handled = false;

    const timer = window.setInterval(() => {
      // The extension was reloaded or removed, so this script can no longer use chrome APIs.
      if (!chrome.runtime?.id) {
        window.clearInterval(timer);
        return;
      }

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
    }, RESULT_CHECK_INTERVAL);
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

    const wrapper = document.createElement('div');
    wrapper.className = 'scu-programmers-wrapper';

    PLATFORMS.forEach((platform) => {
      const button = createUploadButton(platform);
      button.addEventListener('click', () =>
        handleUploadClick(button, platform),
      );
      wrapper.appendChild(button);
    });

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
