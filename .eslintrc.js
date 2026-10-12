module.exports = {
  env: {
    browser: true,
    es2021: true,
    // `chrome.*` extension APIs
    webextensions: true,
    // `$` from library/jquery
    jquery: true,
  },
  extends: ['airbnb-base', 'prettier'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    'no-use-before-define': 'off',
    // Native ES modules in the extension need explicit `.js` extensions.
    'import/extensions': ['error', 'always', { ignorePackages: true }],
    // Modules use named exports consistently.
    'import/prefer-default-export': 'off',
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
    // 추가 규칙 설정 (필요시)
  },
};
