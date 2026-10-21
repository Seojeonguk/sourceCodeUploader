import { t } from '../../scripts/common/utils/index.js';

// The upload destinations, in the order of their tabs.
export const PLATFORMS = Object.freeze(['github', 'notion']);

const panelOf = (platform) => document.querySelector(`#${platform}-panel`);
const tabOf = (platform) => document.querySelector(`#${platform}-tab`);

/**
 * Marks the steps of a platform as done, and its tab as ready once it is logged in and has
 * a repository or database selected.
 * @param {'github'|'notion'} platform
 */
const refresh = (platform) => {
  const panel = panelOf(platform);
  const loggedIn = panel.classList.contains('is-logged-in');
  const target = panel.querySelector('.step-target');
  const ready = loggedIn && target.classList.contains('is-selected');

  panel.querySelector('.step-login').classList.toggle('is-done', loggedIn);
  target.classList.toggle('is-done', ready);
  panel.classList.toggle('is-ready', ready);
  tabOf(platform).classList.toggle('is-ready', ready);
};

/**
 * Shows that the user is logged in to the platform: the account, and the button logs out.
 * @param {'github'|'notion'} platform
 * @param {?string} account - The account name to show, such as the GitHub user name.
 */
export const showLoggedIn = (platform, account) => {
  const panel = panelOf(platform);
  panel.classList.add('is-logged-in');
  panel.querySelector('.account').textContent = account || t('popupConnected');

  const button = panel.querySelector('.authentication-btn');
  button.textContent = t('popupRemove');
  button.classList.add('delete');
  refresh(platform);
};

/**
 * Shows the selected repository or database of the platform.
 * @param {'github'|'notion'} platform
 * @param {string} name - The name of the repository or database.
 */
export const showSelected = (platform, name) => {
  const panel = panelOf(platform);
  panel.querySelector('.select-list > button').textContent = name;
  panel.querySelector('.step-target').classList.add('is-selected');
  refresh(platform);
};

/**
 * Shows the panel of a platform and marks its tab as selected.
 * @param {'github'|'notion'} platform
 * @param {{ focus?: boolean }} [options] - Whether to move the focus to the tab.
 */
export const selectTab = (platform, { focus = false } = {}) => {
  PLATFORMS.forEach((other) => {
    const selected = other === platform;
    const tab = tabOf(other);
    tab.setAttribute('aria-selected', String(selected));
    // Only the selected tab is in the Tab order; the arrow keys move between the tabs.
    tab.tabIndex = selected ? 0 : -1;
    panelOf(other).hidden = !selected;
  });
  if (focus) {
    tabOf(platform).focus();
  }
};

/**
 * Selects the first platform that is not ready yet, so the popup opens on what is left to do.
 */
export const selectFirstUnfinishedTab = () => {
  const unfinished = PLATFORMS.find(
    (platform) => !panelOf(platform).classList.contains('is-ready'),
  );
  selectTab(unfinished ?? PLATFORMS[0]);
};

/**
 * Switches the tabs with a click, and with the arrow, Home and End keys.
 */
export const initializeTabs = () => {
  PLATFORMS.forEach((platform, index) => {
    const tab = tabOf(platform);
    tab.addEventListener('click', () => selectTab(platform));
    tab.addEventListener('keydown', (e) => {
      const moves = {
        ArrowRight: index + 1,
        ArrowLeft: index - 1,
        Home: 0,
        End: PLATFORMS.length - 1,
      };
      if (!(e.key in moves)) {
        return;
      }
      e.preventDefault();
      const next = (moves[e.key] + PLATFORMS.length) % PLATFORMS.length;
      selectTab(PLATFORMS[next], { focus: true });
    });
  });
};
