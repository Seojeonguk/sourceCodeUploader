import {
  localizePage,
  sendMessage,
  t,
} from '../../scripts/common/utils/index.js';

// The tab closes this long after the login, so the user can see that it worked.
const CLOSE_DELAY = 1500;

const statusElement = document.querySelector('#status');

/**
 * Shows the status of the login.
 * @param {string} message
 * @param {'info'|'success'|'error'} [type='info']
 */
const setStatus = (message, type = 'info') => {
  statusElement.textContent = message || t('somethingWentWrong');
  statusElement.className = `status status-${type}`;
};

const hideCode = () => {
  document.querySelector('#code-section').hidden = true;
};

const wait = (seconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });

const closeTab = async () => {
  const tab = await chrome.tabs.getCurrent();
  if (tab) {
    chrome.tabs.remove(tab.id);
  }
};

const copyCode = async (userCode) => {
  try {
    await navigator.clipboard.writeText(userCode);
    setStatus(t('githubLoginCopied'));
  } catch {
    setStatus(t('githubLoginCopyManually'));
  }
};

/**
 * Asks the background whether the user has entered the code, until the login finishes.
 * @param {number} interval - The seconds to wait before checking.
 */
const waitForLogin = async (interval) => {
  await wait(interval);

  const response = await sendMessage('github', 'pollDeviceLogin');
  if (!response?.ok) {
    hideCode();
    setStatus(response?.message, 'error');
    return;
  }

  const { status, interval: nextInterval } = response.message;
  switch (status) {
    case 'pending':
      waitForLogin(nextInterval);
      return;
    case 'done':
      hideCode();
      setStatus(t('githubLoginDone'), 'success');
      setTimeout(closeTab, CLOSE_DELAY);
      return;
    case 'denied':
      hideCode();
      setStatus(t('githubLoginDenied'), 'error');
      return;
    default:
      hideCode();
      setStatus(t('githubLoginExpired'), 'error');
  }
};

const start = async () => {
  const response = await sendMessage('github', 'startDeviceLogin');
  if (!response?.ok) {
    setStatus(response?.message, 'error');
    return;
  }

  const { userCode, verificationUri, interval } = response.message;

  document.querySelector('#user-code').textContent = userCode;
  document
    .querySelector('#copy-code')
    .addEventListener('click', () => copyCode(userCode));

  const link = document.querySelector('#verification-link');
  link.href = verificationUri;
  // Copy the code as well, so the user can paste it right away.
  link.addEventListener('click', () => copyCode(userCode));

  document.querySelector('#code-section').hidden = false;
  setStatus(t('githubLoginWaiting'));

  waitForLogin(interval);
};

localizePage();
start();
