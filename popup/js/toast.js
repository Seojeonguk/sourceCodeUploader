const TOAST_DURATION = 4000;

/**
 * Shows a message at the bottom of the popup instead of alert().
 * @param {string} message - The message to show.
 * @param {'info'|'error'} [type='info'] - The type of the message.
 */
export const showToast = (message, type = 'info') => {
  $('.scu-toast').remove();

  const toast = $('<div>', {
    class: `scu-toast scu-toast-${type}`,
    role: type === 'error' ? 'alert' : 'status',
    text: message || 'Something went wrong.',
  });

  $('body').append(toast);
  setTimeout(() => toast.remove(), TOAST_DURATION);
};
