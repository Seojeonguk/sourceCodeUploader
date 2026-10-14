// The judge pages where the content scripts run (see `content_scripts` in manifest.json).
const JUDGE_ORIGINS = Object.freeze([
  'https://school.programmers.co.kr',
  'https://programmers.co.kr',
]);

// The only messages that a judge page sends: uploading the solution and reading the auto
// upload option. Logging in, listing repositories or databases and logging out are done
// from the extension pages, so a judge page, which runs next to the site's own scripts,
// cannot ask for them.
const JUDGE_PAGE_ACTIONS = Object.freeze({
  github: Object.freeze(['commit', 'getAutoUpload']),
  notion: Object.freeze(['upload', 'getAutoUpload']),
});

const getOrigin = (url) => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

/**
 * Checks whether the message comes from a page of the extension, such as the popup
 * or the GitHub login page.
 * @param {chrome.runtime.MessageSender} sender
 * @returns {boolean}
 */
const isExtensionPage = (sender) =>
  getOrigin(sender.url) === getOrigin(chrome.runtime.getURL(''));

/**
 * Checks whether the message comes from the content script of a judge page.
 * @param {chrome.runtime.MessageSender} sender
 * @returns {boolean}
 */
const isJudgePage = (sender) =>
  sender.tab !== undefined &&
  sender.frameId === 0 &&
  JUDGE_ORIGINS.includes(getOrigin(sender.url));

/**
 * Checks whether the sender may send the message.
 * The extension pages may send every message, and the judge pages only the upload ones.
 * @param {string} platform - The platform of the message, such as `github`.
 * @param {string} action - The action of the message, such as `commit`.
 * @param {chrome.runtime.MessageSender} sender - The sender given by `chrome.runtime.onMessage`.
 * @returns {boolean}
 */
export const isAllowedSender = (platform, action, sender) => {
  if (sender?.id !== chrome.runtime.id) {
    return false;
  }
  if (isExtensionPage(sender)) {
    return true;
  }
  return (
    isJudgePage(sender) &&
    (JUDGE_PAGE_ACTIONS[platform]?.includes(action) ?? false)
  );
};
