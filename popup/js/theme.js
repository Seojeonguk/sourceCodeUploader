import { logger, setChromeStorage } from '../../scripts/common/utils/index.js';

/**
 * Shows the popup in light or dark mode.
 * @param {boolean} isLightMode - True for light mode; dark is the default.
 */
export const applyLightMode = (isLightMode) => {
  document.body.classList.toggle('light-mode', isLightMode);
  document
    .querySelector('.dark-light')
    .setAttribute('aria-pressed', String(isLightMode));
};

/**
 * Switches between light and dark mode with the moon button, and remembers the choice.
 */
export const initializeLightModeToggle = () => {
  document.querySelector('.dark-light').addEventListener('click', (e) => {
    const isLightMode = !document.body.classList.contains('light-mode');
    applyLightMode(isLightMode);
    // Keeps an open list open.
    e.stopPropagation();
    setChromeStorage('popupLightMode', isLightMode).catch((error) =>
      logger.error('Failed to save the light mode.', error),
    );
  });
};
