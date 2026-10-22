import { logger, t } from '../../scripts/common/utils/index.js';
import { JUDGE_SITES } from '../../scripts/judgeSites.js';
import { showToast } from './toast.js';

/**
 * Creates the switch of an optional site. Turning it on asks Chrome for the site's
 * permissions, which the background then uses to run the site's scripts; turning it off
 * removes them.
 * @param {Object} site - The judge site.
 * @returns {HTMLInputElement} The switch.
 */
const createSiteSwitch = (site) => {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'site-switch';
  input.id = `site-${site.id}`;
  input.setAttribute('aria-label', t('popupSiteEnable', site.name));

  const origins = [...site.origins];
  chrome.permissions
    .contains({ origins })
    .then((enabled) => {
      input.checked = enabled;
    })
    .catch((e) => logger.error('Failed to read the site permissions.', e));

  input.addEventListener('change', async () => {
    try {
      // Chrome asks the user only in response to the click, so this is the first await.
      input.checked = input.checked
        ? await chrome.permissions.request({ origins })
        : !(await chrome.permissions.remove({ origins }));
    } catch (e) {
      logger.error('Failed to change the site permissions.', e);
      input.checked = !input.checked;
      showToast(e.message, 'error');
    }
  });
  return input;
};

/**
 * Lists the judge sites, each with a link to its problems. A required site, such as
 * Programmers, is always in use; an optional one has a switch.
 * @param {ReadonlyArray<Object>} [sites=JUDGE_SITES] - The judge sites.
 */
export const showJudgeSites = (sites = JUDGE_SITES) => {
  document.querySelector('#site-list').replaceChildren(
    ...sites.map((site) => {
      const item = document.createElement('li');
      item.className = 'site';
      item.dataset.site = site.id;

      const siteName = document.createElement('span');
      siteName.className = 'site-name';
      siteName.textContent = site.name;

      let state;
      if (site.optional) {
        state = createSiteSwitch(site);
      } else {
        state = document.createElement('span');
        state.className = 'site-status';
        state.textContent = t('popupSiteInUse');
      }

      const link = document.createElement('a');
      link.className = 'site-link';
      link.href = site.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = t('popupSiteOpen');

      item.append(siteName, state, link);
      return item;
    }),
  );
};
