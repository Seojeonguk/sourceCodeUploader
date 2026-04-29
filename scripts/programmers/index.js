(() => {
  const PROGRAMMERS_TYPE = 'Programmers';
  const RESPONSE_EVENT = 'SCU_PROGRAMMERS_SOURCE_RESPONSE';
  const REQUEST_EVENT = 'SCU_PROGRAMMERS_SOURCE_REQUEST';

  const LANGUAGE_EXTENSIONS = Object.freeze({
    c: 'c',
    'c#': 'cs',
    'c++': 'cpp',
    clang: 'c',
    cpp: 'cpp',
    c_cpp: 'cpp',
    csharp: 'cs',
    cs: 'cs',
    go: 'go',
    java: 'java',
    javascript: 'js',
    js: 'js',
    kotlin: 'kt',
    mysql: 'sql',
    oracle: 'sql',
    php: 'php',
    python: 'py',
    python3: 'py',
    py: 'py',
    ruby: 'rb',
    scala: 'scala',
    swift: 'swift',
    typescript: 'ts',
    ts: 'ts',
  });

  let sourceExtractorReady;

  const normalizeText = (value) => value?.replace(/\s+/g, ' ').trim() ?? '';

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

  const sendGithubCommitMessage = (payload) => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          platform: 'github',
          action: 'commit',
          payload,
        },
        (response) => resolve(response),
      );
    });
  };

  const createUploadButton = () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'scu-programmers-wrapper';

    const button = document.createElement('button');
    button.className = 'scu-programmers-upload';
    button.type = 'button';
    button.title = 'Upload to GitHub';

    const image = document.createElement('img');
    image.src = chrome.runtime.getURL('icon/githubIcon.png');
    image.alt = 'GitHub';

    button.appendChild(image);
    wrapper.appendChild(button);

    return { button, wrapper };
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
    const position = window.getComputedStyle(container).position;
    if (position === 'static') {
      container.style.position = 'relative';
    }
  };

  const getProblemId = () => {
    const match = window.location.pathname.match(/lessons\/([^/?#]+)/);
    return match?.[1] ?? 'unknown';
  };

  const getProblemTitle = () => {
    const candidates = [
      '.challenge-title',
      '.lesson-title',
      '.algorithm-title',
      'h1',
      'h2',
    ];

    const title = candidates
      .map((selector) =>
        normalizeText(document.querySelector(selector)?.textContent),
      )
      .find(Boolean);

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

  const getFileExtension = () => {
    const language = getLanguage();
    const normalized = language.replace(/[^a-z0-9_+#]/g, '');
    return (
      LANGUAGE_EXTENSIONS[normalized] ?? LANGUAGE_EXTENSIONS[language] ?? 'txt'
    );
  };

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

    const title = getProblemTitle();
    const problemId = getProblemId();

    return {
      extension: getFileExtension(),
      problemId,
      sourceCode,
      title: title || problemId,
      type: PROGRAMMERS_TYPE,
    };
  };

  const handleUploadClick = async (button) => {
    button.disabled = true;

    try {
      const payload = await buildPayload();
      const response = await sendGithubCommitMessage(payload);
      alert(response?.message);
    } catch (error) {
      console.error('[SCU]', error);
      alert(error.message);
    } finally {
      button.disabled = false;
    }
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

    const { button, wrapper } = createUploadButton();
    button.addEventListener('click', () => handleUploadClick(button));
    container.appendChild(wrapper);

    return true;
  };

  ensureSourceExtractor();

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
