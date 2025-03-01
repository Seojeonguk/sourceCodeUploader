export const STATUS_TABLE_INDICES = Object.freeze({
  SUBMIT_NUM: 0,
  SUBMIT_ID: 1,
  PROBLEM_ID: 2,
  RESULT: 3,
  LANGUAGE: 6,
});

export const SELECTORS = Object.freeze({
  LOGIN_ID: '.username',
  SOURCE_TEXTAREA: "textarea[name='source']",
  STATUS_TABLE: '#status-table',
  CODE_MIRROR: '.CodeMirror',
  PROBLEM_LINK: "table a[href^='/problem/']",
  RESULT_TABLE: 'table tbody tr td',
});
