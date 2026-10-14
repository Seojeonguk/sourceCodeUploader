/**
 * The rules of eslint-config-airbnb-base 15.0.0 that this project used with ESLint 8,
 * ported to ESLint 10 with the same options (eslint-config-airbnb-base supports only ESLint 8).
 *
 * Left out:
 * - the rules already in `js.configs.recommended` of @eslint/js,
 * - the rules deprecated in ESLint 10: the style rules (lines-around-directive,
 *   lines-between-class-members, spaced-comment), the Node.js rules (global-require,
 *   no-buffer-constructor, no-new-require, no-path-concat), no-return-await, and
 *   no-new-symbol (covered by no-new-native-nonconstructor in the recommended rules).
 *   no-new-object is replaced by no-object-constructor.
 * - the style rules, which eslint-config-prettier turns off anyway.
 *
 * `import/*` rules are `import-x/*` with eslint-plugin-import-x.
 * The rules with project options are in eslint.config.js.
 */
export const airbnbRules = Object.freeze({
  'array-callback-return': [
    'error',
    {
      allowImplicit: true,
      checkForEach: false,
      allowVoid: false,
    },
  ],
  'arrow-body-style': [
    'error',
    'as-needed',
    {
      requireReturnForObjectLiteral: false,
    },
  ],
  'block-scoped-var': 'error',
  camelcase: [
    'error',
    {
      properties: 'never',
      ignoreDestructuring: false,
      ignoreImports: false,
      ignoreGlobals: false,
    },
  ],
  'class-methods-use-this': [
    'error',
    {
      exceptMethods: [],
      enforceForClassFields: true,
    },
  ],
  'consistent-return': 'error',
  'default-case': [
    'error',
    {
      commentPattern: '^no default$',
    },
  ],
  'default-case-last': 'error',
  'default-param-last': 'error',
  'dot-notation': [
    'error',
    {
      allowKeywords: true,
      allowPattern: '',
    },
  ],
  eqeqeq: [
    'error',
    'always',
    {
      null: 'ignore',
    },
  ],
  'func-names': 'error',
  'grouped-accessor-pairs': 'error',
  'guard-for-in': 'error',
  'max-classes-per-file': ['error', 1],
  'new-cap': [
    'error',
    {
      newIsCap: true,
      newIsCapExceptions: [],
      capIsNew: false,
      capIsNewExceptions: ['Immutable.Map', 'Immutable.Set', 'Immutable.List'],
      properties: true,
    },
  ],
  'no-alert': 'error',
  'no-array-constructor': 'error',
  'no-await-in-loop': 'error',
  'no-bitwise': 'error',
  'no-caller': 'error',
  'no-console': 'error',
  'no-constructor-return': 'error',
  'no-continue': 'error',
  'no-else-return': [
    'error',
    {
      allowElseIf: false,
    },
  ],
  'no-empty-function': [
    'error',
    {
      allow: ['arrowFunctions', 'functions', 'methods'],
    },
  ],
  'no-eval': 'error',
  'no-extend-native': 'error',
  'no-extra-bind': 'error',
  'no-extra-label': 'error',
  'no-implied-eval': 'error',
  'no-inner-declarations': 'error',
  'no-iterator': 'error',
  'no-label-var': 'error',
  'no-labels': [
    'error',
    {
      allowLoop: false,
      allowSwitch: false,
    },
  ],
  'no-lone-blocks': 'error',
  'no-lonely-if': 'error',
  'no-loop-func': 'error',
  'no-multi-assign': 'error',
  'no-multi-str': 'error',
  'no-nested-ternary': 'error',
  'no-new': 'error',
  'no-new-func': 'error',
  'no-new-wrappers': 'error',
  'no-object-constructor': 'error',
  'no-octal-escape': 'error',
  'no-plusplus': 'error',
  'no-promise-executor-return': 'error',
  'no-proto': 'error',
  'no-restricted-exports': [
    'error',
    {
      restrictedNamedExports: ['default', 'then'],
    },
  ],
  'no-restricted-globals': [
    'error',
    {
      name: 'isFinite',
      message:
        'Use Number.isFinite instead https://github.com/airbnb/javascript#standard-library--isfinite',
    },
    {
      name: 'isNaN',
      message:
        'Use Number.isNaN instead https://github.com/airbnb/javascript#standard-library--isnan',
    },
    'addEventListener',
    'blur',
    'close',
    'closed',
    'confirm',
    'defaultStatus',
    'defaultstatus',
    'event',
    'external',
    'find',
    'focus',
    'frameElement',
    'frames',
    'history',
    'innerHeight',
    'innerWidth',
    'length',
    'location',
    'locationbar',
    'menubar',
    'moveBy',
    'moveTo',
    'name',
    'onblur',
    'onerror',
    'onfocus',
    'onload',
    'onresize',
    'onunload',
    'open',
    'opener',
    'opera',
    'outerHeight',
    'outerWidth',
    'pageXOffset',
    'pageYOffset',
    'parent',
    'print',
    'removeEventListener',
    'resizeBy',
    'resizeTo',
    'screen',
    'screenLeft',
    'screenTop',
    'screenX',
    'screenY',
    'scroll',
    'scrollbars',
    'scrollBy',
    'scrollTo',
    'scrollX',
    'scrollY',
    'self',
    'status',
    'statusbar',
    'stop',
    'toolbar',
    'top',
  ],
  'no-restricted-properties': [
    'error',
    {
      object: 'arguments',
      property: 'callee',
      message: 'arguments.callee is deprecated',
    },
    {
      object: 'global',
      property: 'isFinite',
      message: 'Please use Number.isFinite instead',
    },
    {
      object: 'self',
      property: 'isFinite',
      message: 'Please use Number.isFinite instead',
    },
    {
      object: 'window',
      property: 'isFinite',
      message: 'Please use Number.isFinite instead',
    },
    {
      object: 'global',
      property: 'isNaN',
      message: 'Please use Number.isNaN instead',
    },
    {
      object: 'self',
      property: 'isNaN',
      message: 'Please use Number.isNaN instead',
    },
    {
      object: 'window',
      property: 'isNaN',
      message: 'Please use Number.isNaN instead',
    },
    {
      property: '__defineGetter__',
      message: 'Please use Object.defineProperty instead.',
    },
    {
      property: '__defineSetter__',
      message: 'Please use Object.defineProperty instead.',
    },
    {
      object: 'Math',
      property: 'pow',
      message: 'Use the exponentiation operator (**) instead.',
    },
  ],
  'no-restricted-syntax': [
    'error',
    {
      selector: 'ForInStatement',
      message:
        'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.',
    },
    {
      selector: 'ForOfStatement',
      message:
        'iterators/generators require regenerator-runtime, which is too heavyweight for this guide to allow them. Separately, loops should be avoided in favor of array iterations.',
    },
    {
      selector: 'LabeledStatement',
      message:
        'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
    },
    {
      selector: 'WithStatement',
      message:
        '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
    },
  ],
  'no-return-assign': ['error', 'always'],
  'no-script-url': 'error',
  'no-self-compare': 'error',
  'no-sequences': 'error',
  'no-shadow': 'error',
  'no-template-curly-in-string': 'error',
  'no-throw-literal': 'error',
  'no-undef-init': 'error',
  'no-underscore-dangle': [
    'error',
    {
      allow: [],
      allowAfterThis: false,
      allowAfterSuper: false,
      enforceInMethodNames: true,
      allowAfterThisConstructor: false,
      allowFunctionParams: true,
      enforceInClassFields: false,
      allowInArrayDestructuring: true,
      allowInObjectDestructuring: true,
    },
  ],
  'no-unneeded-ternary': [
    'error',
    {
      defaultAssignment: false,
    },
  ],
  'no-unreachable-loop': [
    'error',
    {
      ignore: [],
    },
  ],
  'no-unused-expressions': [
    'error',
    {
      allowShortCircuit: false,
      allowTernary: false,
      allowTaggedTemplates: false,
      enforceForJSX: false,
    },
  ],
  'no-useless-computed-key': 'error',
  'no-useless-concat': 'error',
  'no-useless-constructor': 'error',
  'no-useless-rename': [
    'error',
    {
      ignoreDestructuring: false,
      ignoreImport: false,
      ignoreExport: false,
    },
  ],
  'no-useless-return': 'error',
  'no-var': 'error',
  'no-void': 'error',
  'object-shorthand': [
    'error',
    'always',
    {
      ignoreConstructors: false,
      avoidQuotes: true,
    },
  ],
  'one-var': ['error', 'never'],
  'operator-assignment': ['error', 'always'],
  'prefer-arrow-callback': [
    'error',
    {
      allowNamedFunctions: false,
      allowUnboundThis: true,
    },
  ],
  'prefer-const': [
    'error',
    {
      destructuring: 'any',
      ignoreReadBeforeAssign: true,
    },
  ],
  'prefer-destructuring': [
    'error',
    {
      VariableDeclarator: {
        array: false,
        object: true,
      },
      AssignmentExpression: {
        array: true,
        object: false,
      },
    },
    {
      enforceForRenamedProperties: false,
    },
  ],
  'prefer-exponentiation-operator': 'error',
  'prefer-numeric-literals': 'error',
  'prefer-object-spread': 'error',
  'prefer-promise-reject-errors': [
    'error',
    {
      allowEmptyReject: true,
    },
  ],
  'prefer-regex-literals': [
    'error',
    {
      disallowRedundantWrapping: true,
    },
  ],
  'prefer-rest-params': 'error',
  'prefer-spread': 'error',
  'prefer-template': 'error',
  radix: 'error',
  strict: ['error', 'never'],
  'symbol-description': 'error',
  'unicode-bom': ['error', 'never'],
  'vars-on-top': 'error',
  yoda: 'error',
});

export const airbnbImportRules = Object.freeze({
  'import-x/export': 'error',
  'import-x/first': 'error',
  'import-x/named': 'error',
  'import-x/newline-after-import': 'error',
  'import-x/no-absolute-path': 'error',
  'import-x/no-amd': 'error',
  'import-x/no-cycle': [
    'error',
    {
      maxDepth: '∞',
      ignoreExternal: false,
      allowUnsafeDynamicCyclicDependency: false,
    },
  ],
  'import-x/no-duplicates': 'error',
  'import-x/no-dynamic-require': 'error',
  'import-x/no-import-module-exports': [
    'error',
    {
      exceptions: [],
    },
  ],
  'import-x/no-mutable-exports': 'error',
  'import-x/no-named-as-default': 'error',
  'import-x/no-named-as-default-member': 'error',
  'import-x/no-named-default': 'error',
  'import-x/no-relative-packages': 'error',
  'import-x/no-self-import': 'error',
  'import-x/no-unresolved': [
    'error',
    {
      commonjs: true,
      caseSensitive: true,
      caseSensitiveStrict: false,
    },
  ],
  'import-x/no-useless-path-segments': [
    'error',
    {
      commonjs: true,
    },
  ],
  'import-x/no-webpack-loader-syntax': 'error',
  'import-x/order': [
    'error',
    {
      groups: [['builtin', 'external', 'internal']],
      distinctGroup: true,
      warnOnUnassignedImports: false,
    },
  ],
});
