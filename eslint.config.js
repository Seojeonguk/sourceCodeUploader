import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { importX } from 'eslint-plugin-import-x';
import globals from 'globals';

import { airbnbImportRules, airbnbRules } from './eslint.airbnb-rules.js';

export default [
  js.configs.recommended,
  importX.flatConfigs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        // `chrome.*` extension APIs
        ...globals.webextensions,
      },
    },
    rules: {
      ...airbnbRules,
      ...airbnbImportRules,
      // Native ES modules in the extension need explicit `.js` extensions.
      'import-x/extensions': ['error', 'always', { ignorePackages: true }],
      // Only the tests and the lint config use the devDependencies; the extension has none.
      'import-x/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            'tests/**',
            'eslint.config.js',
            'eslint.airbnb-rules.js',
          ],
          optionalDependencies: false,
        },
      ],
      // Allow updating properties of DOM elements passed as arguments.
      'no-param-reassign': [
        'error',
        {
          props: true,
          ignorePropertyModificationsFor: [
            // airbnb-base defaults
            'acc',
            'accumulator',
            'e',
            'ctx',
            'context',
            'req',
            'request',
            'res',
            'response',
            '$scope',
            'staticContext',
            // DOM elements
            'button',
            'container',
          ],
        },
      ],
    },
  },
  {
    // The tests run in Node.js (node:test).
    files: ['tests/**'],
    languageOptions: {
      globals: globals.node,
    },
  },
  // Turns off the style rules that conflict with Prettier. Keep it last.
  prettier,
];
