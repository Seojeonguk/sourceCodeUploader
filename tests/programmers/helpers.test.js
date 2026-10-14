import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

// helpers.js is a classic content script, so it is run in a sandbox instead of imported.
// Arrays created in the sandbox are copied before deepEqual, since their prototype differs.
const loadHelpers = () => {
  const source = readFileSync(
    new URL('../../scripts/programmers/helpers.js', import.meta.url),
    'utf8',
  );
  const context = vm.createContext({});
  vm.runInContext(source, context);
  return context.SCU_PROGRAMMERS;
};

const {
  formatLevel,
  getCategoryTags,
  getExtensionFromFileLabel,
  getExtensionFromLanguage,
  isAcceptedResult,
  normalizeText,
  toProblemUrl,
} = loadHelpers();

describe('normalizeText', () => {
  it('collapses whitespace and trims', () => {
    assert.equal(normalizeText('\n  두 수의   합\n'), '두 수의 합');
  });

  it('returns an empty string for empty values', () => {
    assert.equal(normalizeText(undefined), '');
    assert.equal(normalizeText(null), '');
  });
});

describe('getExtensionFromLanguage', () => {
  it('maps language names to extensions', () => {
    assert.equal(getExtensionFromLanguage('Python3'), 'py');
    assert.equal(getExtensionFromLanguage('Java'), 'java');
    assert.equal(getExtensionFromLanguage('C++'), 'cpp');
    assert.equal(getExtensionFromLanguage('C#'), 'cs');
    assert.equal(getExtensionFromLanguage('Kotlin'), 'kt');
    assert.equal(getExtensionFromLanguage('JavaScript'), 'js');
    assert.equal(getExtensionFromLanguage('Oracle'), 'sql');
  });

  it('ignores spaces and symbols in the language name', () => {
    assert.equal(getExtensionFromLanguage(' Python 3 '), 'py');
  });

  it('returns null for unknown languages', () => {
    assert.equal(getExtensionFromLanguage('Brainfuck'), null);
    assert.equal(getExtensionFromLanguage(''), null);
  });
});

describe('getExtensionFromFileLabel', () => {
  it('reads the extension from the editor tab label', () => {
    assert.equal(getExtensionFromFileLabel('solution.py'), 'py');
    assert.equal(getExtensionFromFileLabel(' Solution.java\n'), 'java');
    assert.equal(getExtensionFromFileLabel('solution.cpp'), 'cpp');
  });

  it('returns null when there is no extension', () => {
    assert.equal(getExtensionFromFileLabel('solution'), null);
    assert.equal(getExtensionFromFileLabel(undefined), null);
  });
});

describe('formatLevel', () => {
  it('formats the challenge level', () => {
    assert.equal(formatLevel('2'), 'Lv. 2');
    assert.equal(formatLevel(0), 'Lv. 0');
    assert.equal(formatLevel('lv3'), 'Lv. 3');
  });

  it('returns null when there is no level', () => {
    assert.equal(formatLevel(undefined), null);
    assert.equal(formatLevel(''), null);
  });
});

describe('getCategoryTags', () => {
  it('removes the root and the title from the breadcrumb', () => {
    assert.deepEqual(
      [...getCategoryTags(['코딩테스트 연습', ' 해시 ', '폰켓몬'], '폰켓몬')],
      ['해시'],
    );
  });

  it('removes empty and duplicated items', () => {
    assert.deepEqual(
      [...getCategoryTags(['', '해시', '해시'], '제목')],
      ['해시'],
    );
  });
});

describe('isAcceptedResult', () => {
  it('accepts the accepted result title', () => {
    assert.equal(isAcceptedResult('정답입니다.'), true);
    assert.equal(isAcceptedResult('  정답입니다!  '), true);
  });

  it('rejects other results', () => {
    assert.equal(isAcceptedResult('틀렸습니다.'), false);
    assert.equal(isAcceptedResult('실행한 결괏값이 기댓값과 다릅니다.'), false);
    assert.equal(isAcceptedResult(''), false);
  });
});

describe('toProblemUrl', () => {
  it('uses school.programmers.co.kr whichever host the page is on', () => {
    const pathname = '/learn/courses/30/lessons/1845';

    // Both hosts give the same path, so the Notion upload finds the same page.
    assert.equal(
      toProblemUrl(pathname),
      'https://school.programmers.co.kr/learn/courses/30/lessons/1845',
    );
  });
});
