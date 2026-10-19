import { t } from '../../scripts/common/utils/i18n.js';

const TOAST_DURATION = 4000;

/**
 * Shows a message at the bottom of the popup instead of alert().
 * @param {string} message - The message to show.
 * @param {'info'|'error'} [type='info'] - The type of the message.
 */
export const showToast = (message, type = 'info') => {
  document.querySelectorAll('.scu-toast').forEach((toast) => toast.remove());

  const toast = document.createElement('div');
  toast.className = `scu-toast scu-toast-${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.textContent = message || t('somethingWentWrong');

  document.body.append(toast);
  setTimeout(() => toast.remove(), TOAST_DURATION);
};
