/**
 * The upload buttons, the messages on the page and the messages to the background, shared by
 * the content scripts of the judge sites (Programmers, Codeforces, and JUNGOL later).
 *
 * Content scripts are classic scripts, so this file is loaded first and shares its functions
 * through `globalThis.SCU_CONTENT`.
 */
(() => {
  const TOAST_DURATION = 5000;

  const PLATFORMS = Object.freeze([
    Object.freeze({
      id: 'github',
      name: 'GitHub',
      action: 'commit',
      icon: 'icon/githubIcon.png',
    }),
    Object.freeze({
      id: 'notion',
      name: 'Notion',
      action: 'upload',
      icon: 'icon/notionIcon.png',
    }),
  ]);

  // The same lookup as t() in scripts/common/utils/i18n.js, which a classic script cannot import.
  const t = (key, ...substitutions) =>
    chrome.i18n.getMessage(key, substitutions.map(String)) || key;

  // Like sendMessage in scripts/common/utils/chrome/runtime.js, which a content script cannot import.
  const sendMessage = (platform, action, payload) =>
    new Promise((resolve) => {
      chrome.runtime.sendMessage({ platform, action, payload }, (response) => {
        // Reading lastError also keeps Chrome from logging it as unchecked.
        const error = chrome.runtime.lastError;
        if (error || response === undefined) {
          resolve({ ok: false, message: error?.message ?? t('noResponse') });
          return;
        }
        resolve(response);
      });
    });

  const getToastContainer = () => {
    let container = document.querySelector('.scu-content-toasts');
    if (!container) {
      container = document.createElement('div');
      container.className = 'scu-content-toasts';
      document.body.appendChild(container);
    }
    return container;
  };

  /**
   * Shows a message on the page instead of alert().
   * @param {string} message - The message to show.
   * @param {Object} [options]
   * @param {'info'|'success'|'error'} [options.type='info'] - The type of the message.
   * @param {?string} [options.link] - A URL to open from the message.
   * @param {?string} [options.linkText] - The text of the link.
   */
  const showToast = (
    message,
    { type = 'info', link = null, linkText = null } = {},
  ) => {
    const toast = document.createElement('div');
    toast.className = `scu-content-toast scu-content-toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.textContent = message || t('somethingWentWrong');

    if (link) {
      const anchor = document.createElement('a');
      anchor.href = link;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = linkText ?? t('open');
      toast.append(' ', anchor);
    }

    getToastContainer().appendChild(toast);
    window.setTimeout(() => toast.remove(), TOAST_DURATION);
  };

  /**
   * Uploads to a platform and shows the result, with a link to the uploaded file or page.
   * @param {Object} platform - One of PLATFORMS.
   * @param {Object} payload - The upload payload.
   */
  const upload = async (platform, payload) => {
    const response = await sendMessage(platform.id, platform.action, payload);
    if (!response?.ok) {
      showToast(response?.message, { type: 'error' });
      return;
    }

    const link = /^https?:\/\//.test(response.message)
      ? response.message
      : null;
    showToast(t('uploadedTo', platform.name), { type: 'success', link });
  };

  /**
   * Creates the upload buttons. A click builds the payload, then uploads it.
   * @param {() => Promise<Object>} buildPayload - Builds the upload payload.
   * @returns {HTMLDivElement} The buttons in a wrapper.
   */
  const createUploadButtons = (buildPayload) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'scu-content-wrapper';

    PLATFORMS.forEach((platform) => {
      const button = document.createElement('button');
      button.className = 'scu-content-upload';
      button.type = 'button';
      button.title = t('uploadTo', platform.name);
      button.dataset.platform = platform.id;

      const image = document.createElement('img');
      image.src = chrome.runtime.getURL(platform.icon);
      image.alt = platform.name;
      button.appendChild(image);

      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await upload(platform, await buildPayload());
        } catch (error) {
          // eslint-disable-next-line no-console -- a classic content script cannot import the logger
          console.error('[SCU]', error);
          showToast(error.message, { type: 'error' });
        } finally {
          button.disabled = false;
        }
      });
      wrapper.appendChild(button);
    });

    return wrapper;
  };

  /**
   * Returns the platforms with auto upload on. The storage is hidden from content scripts,
   * so the background reads the options.
   * @returns {Promise<Object[]>}
   */
  const getAutoUploadPlatforms = async () => {
    const responses = await Promise.all(
      PLATFORMS.map(({ id }) => sendMessage(id, 'getAutoUpload')),
    );
    return PLATFORMS.filter(
      (platform, index) =>
        responses[index].ok && responses[index].message === true,
    );
  };

  globalThis.SCU_CONTENT = Object.freeze({
    PLATFORMS,
    t,
    sendMessage,
    showToast,
    upload,
    createUploadButtons,
    getAutoUploadPlatforms,
  });
})();
