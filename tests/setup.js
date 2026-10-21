// Loaded before every test file (`node --test --import ./tests/setup.js`): the messages are
// English, as with Chrome in English, for the code that runs without a chrome mock.
import { chromeI18n } from './helpers/i18n.js';

globalThis.chrome = { i18n: chromeI18n };
