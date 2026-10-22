import { logger } from './common/utils/index.js';
import { JUDGE_SITES } from './judgeSites.js';

const optionalSites = (sites) => sites.filter((site) => site.optional);

/**
 * Registers the content scripts of the optional sites whose permissions the user granted,
 * and unregisters those of the others, such as a site whose permission was removed in
 * chrome://extensions. Running it again changes nothing.
 * @param {ReadonlyArray<Object>} [sites=JUDGE_SITES] - The judge sites.
 */
export const syncSiteScripts = async (sites = JUDGE_SITES) => {
  const registered = new Set(
    (await chrome.scripting.getRegisteredContentScripts()).map(({ id }) => id),
  );

  await Promise.all(
    optionalSites(sites).map(async (site) => {
      const scripts = site.contentScripts ?? [];
      const enabled = await chrome.permissions.contains({
        origins: [...site.origins],
      });

      if (enabled) {
        const missing = scripts.filter(({ id }) => !registered.has(id));
        if (missing.length > 0) {
          await chrome.scripting.registerContentScripts(missing);
        }
        return;
      }

      const ids = scripts
        .map(({ id }) => id)
        .filter((id) => registered.has(id));
      if (ids.length > 0) {
        await chrome.scripting.unregisterContentScripts({ ids });
      }
    }),
  );
};

/**
 * Keeps the content scripts of the optional sites in line with their permissions: now, and
 * whenever the user grants or removes one.
 * @param {ReadonlyArray<Object>} [sites=JUDGE_SITES] - The judge sites.
 */
export const initializeSitePermissions = (sites = JUDGE_SITES) => {
  const sync = () =>
    syncSiteScripts(sites).catch((e) =>
      logger.error('Failed to register the scripts of the judge sites.', e),
    );

  chrome.permissions.onAdded.addListener(sync);
  chrome.permissions.onRemoved.addListener(sync);
  sync();
};
