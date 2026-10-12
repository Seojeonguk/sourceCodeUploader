import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const REQUEST_EVENT = 'SCU_PROGRAMMERS_SOURCE_REQUEST';

const source = readFileSync(
  new URL('../../scripts/programmers/sourceExtractor.js', import.meta.url),
  'utf8',
);

const element = (properties = {}) => ({ childNodes: [], ...properties });
const text = (textContent) => ({ textContent, childNodes: [] });
const input = (value) => ({ tagName: 'INPUT', value, childNodes: [] });

/**
 * Runs sourceExtractor.js on a fake page and requests the source code.
 * @param {Object} param
 * @param {Object<string, Object>} [param.elements={}] - The elements returned by querySelector.
 * @param {Object[]} [param.textareas=[]] - The elements returned by querySelectorAll('textarea').
 * @param {Object} [param.monaco] - `window.monaco`.
 * @returns {string} The source code sent back to the content script.
 */
const extract = ({ elements = {}, textareas = [], monaco } = {}) => {
  const listeners = [];
  const messages = [];
  const window = {
    monaco,
    location: { origin: 'https://school.programmers.co.kr' },
    addEventListener: (type, listener) => listeners.push(listener),
    postMessage: (message) => messages.push(message),
  };
  const document = {
    querySelector: (selector) => elements[selector] ?? null,
    querySelectorAll: (selector) => (selector === 'textarea' ? textareas : []),
  };

  vm.runInContext(source, vm.createContext({ window, document }));
  listeners.forEach((listener) =>
    listener({ source: window, data: { type: REQUEST_EVENT, requestId: '1' } }),
  );

  assert.equal(messages.length, 1);
  assert.equal(messages[0].requestId, '1');
  return messages[0].sourceCode;
};

describe('sourceExtractor', () => {
  it('reads CodeMirror first', () => {
    const sourceCode = extract({
      elements: {
        '.CodeMirror': { CodeMirror: { getValue: () => 'from codemirror' } },
        'textarea#code': { value: 'stale textarea' },
      },
    });

    assert.equal(sourceCode, 'from codemirror');
  });

  it('reads textarea#code without CodeMirror', () => {
    const sourceCode = extract({
      elements: { 'textarea#code': { value: 'from textarea' } },
    });

    assert.equal(sourceCode, 'from textarea');
  });

  it('fills in the answers of a fill-in-the-blank problem', () => {
    const pre = element({
      childNodes: [
        text('SELECT '),
        input('NAME'),
        element({ childNodes: [text(' FROM '), input('ANIMAL_INS')] }),
      ],
    });
    const sourceCode = extract({
      elements: { 'input[name^="input_code"]': { closest: () => pre } },
    });

    assert.equal(sourceCode, 'SELECT NAME FROM ANIMAL_INS');
  });

  it('reads the focused Monaco editor instead of the first model', () => {
    const editor = (value, focused) => ({
      hasTextFocus: () => focused,
      getModel: () => ({ getValue: () => value }),
    });
    const sourceCode = extract({
      monaco: {
        editor: {
          getEditors: () => [editor('other', false), editor('focused', true)],
          getModels: () => [{ getValue: () => 'first model' }],
        },
      },
    });

    assert.equal(sourceCode, 'focused');
  });

  it('skips empty editors and falls back to a filled textarea', () => {
    const sourceCode = extract({
      elements: {
        '.CodeMirror': { CodeMirror: { getValue: () => '  ' } },
      },
      textareas: [{ value: '' }, { value: 'from another textarea' }],
    });

    assert.equal(sourceCode, 'from another textarea');
  });

  it('sends an empty string when no code is found', () => {
    assert.equal(extract(), '');
  });

  it('ignores messages from other windows', () => {
    const listeners = [];
    const messages = [];
    const window = {
      location: { origin: 'https://school.programmers.co.kr' },
      addEventListener: (type, listener) => listeners.push(listener),
      postMessage: (message) => messages.push(message),
    };
    vm.runInContext(
      source,
      vm.createContext({ window, document: { querySelector: () => null } }),
    );

    listeners.forEach((listener) =>
      listener({ source: {}, data: { type: REQUEST_EVENT, requestId: '1' } }),
    );

    assert.equal(messages.length, 0);
  });
});
