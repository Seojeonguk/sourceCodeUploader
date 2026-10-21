import { readFileSync } from 'node:fs';

const readMessages = (locale) =>
  JSON.parse(
    readFileSync(
      new URL(`../../_locales/${locale}/messages.json`, import.meta.url),
      'utf8',
    ),
  );

// The messages of each locale, as in `_locales/<locale>/messages.json`.
export const MESSAGES = Object.freeze({
  en: readMessages('en'),
  ko: readMessages('ko'),
});

/**
 * Formats a message like chrome.i18n.getMessage: each `$NAME$` is replaced by the content of
 * its placeholder, where `$1` … `$9` are the substitutions.
 * @param {{message: string, placeholders?: Object}} entry - The message entry.
 * @param {string[]} substitutions - The substitutions.
 * @returns {string} The message.
 */
export const formatMessage = (entry, substitutions) =>
  entry.message.replace(/\$([A-Za-z0-9_@]+)\$/g, (match, name) => {
    const content = entry.placeholders?.[name.toLowerCase()]?.content;
    return content === undefined
      ? match
      : content.replace(/\$([1-9])/g, (_, n) => substitutions[n - 1] ?? '');
  });

/**
 * Creates a `chrome.i18n` that reads the messages of a locale.
 * Like Chrome, an unknown key gives an empty string.
 * @param {'en'|'ko'} [locale='en'] - The locale.
 * @returns {{getMessage: Function, getUILanguage: Function}}
 */
export const createChromeI18n = (locale = 'en') => ({
  getMessage: (key, substitutions = []) => {
    const entry = MESSAGES[locale][key];
    return entry ? formatMessage(entry, [substitutions].flat()) : '';
  },
  getUILanguage: () => locale,
});

// The English `chrome.i18n`, which the chrome mocks of the tests include.
export const chromeI18n = createChromeI18n('en');
