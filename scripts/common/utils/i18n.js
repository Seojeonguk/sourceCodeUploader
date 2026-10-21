/**
 * Returns a message in the language of the browser, from `_locales/<locale>/messages.json`.
 * Chrome falls back to `default_locale` (en) for other languages.
 * @param {string} key - The message name.
 * @param {...*} substitutions - The values of the placeholders, in order.
 * @returns {string} The message, or the key if there is no such message.
 */
export const t = (key, ...substitutions) =>
  globalThis.chrome?.i18n?.getMessage(key, substitutions.map(String)) || key;

/**
 * Translates the static texts of an extension page, marked in its HTML:
 * - `data-i18n="<key>"` for the text,
 * - `data-i18n-aria-label="<key>"` for `aria-label`,
 * - `data-i18n-arg="value"` for the placeholder of either.
 * The HTML keeps the English texts, so the page reads the same before this runs.
 * @param {Document} [doc=document] - The page.
 */
export const localizePage = (doc = document) => {
  const root = doc.documentElement;
  root.lang = t('htmlLang');

  doc.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n, ...argsOf(element));
  });
  doc.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    element.setAttribute(
      'aria-label',
      t(element.dataset.i18nAriaLabel, ...argsOf(element)),
    );
  });
};

const argsOf = (element) =>
  element.dataset.i18nArg === undefined ? [] : [element.dataset.i18nArg];
