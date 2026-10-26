import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

import { PROBLEM_DATA } from '../fixtures/jungol/judge.js';

// Both are classic content scripts, so they are run in a sandbox instead of imported.
const loadScripts = () => {
  const context = vm.createContext({});
  ['helpers.js', 'tagNames.js'].forEach((file) => {
    vm.runInContext(
      readFileSync(
        new URL(`../../scripts/jungol/${file}`, import.meta.url),
        'utf8',
      ),
      context,
    );
  });
  return context;
};

const { SCU_JUNGOL, SCU_JUNGOL_TAGS } = loadScripts();
const { TAGS, nameTags } = SCU_JUNGOL_TAGS;

const tagsOf = (problemId) =>
  SCU_JUNGOL.readProblemData(JSON.parse(PROBLEM_DATA[problemId]), problemId)
    .tags;

describe('nameTags', () => {
  it('names each tag of a real problem once, in Korean', () => {
    assert.deepEqual(
      [...nameTags(tagsOf(1000), 'ko')],
      ['사칙연산', '구현', '수학', '애드 혹', '런타임 전의 전처리'],
    );
    assert.deepEqual(
      [...nameTags(tagsOf(2000), 'ko')],
      ['다이나믹 프로그래밍', '너비 우선 탐색'],
    );
  });

  it('names each tag of a real problem once, in English for any other language', () => {
    const english = [
      'arithmetic',
      'implementation',
      'mathematics',
      'ad-hoc',
      'precomputation',
    ];
    assert.deepEqual([...nameTags(tagsOf(1000), 'en')], english);
    assert.deepEqual([...nameTags(tagsOf(1000), 'en-US')], english);
    assert.deepEqual([...nameTags(tagsOf(1000), 'ja')], english);
    assert.deepEqual(
      [...nameTags(tagsOf(2000), 'en')],
      ['dynamic programming', 'breadth-first search'],
    );
  });

  it('reads a Korean region as Korean', () => {
    assert.deepEqual([...nameTags(['dp'], 'ko-KR')], ['다이나믹 프로그래밍']);
  });

  it('knows the other names that the site keeps for a tag', () => {
    assert.deepEqual(
      [...nameTags(['동적 계획법', 'DP', 'dp', '자료구조', 'BFS'], 'en')],
      ['dynamic programming', 'data structures', 'breadth-first search'],
    );
  });

  it('keeps the key of an unknown tag, once', () => {
    assert.deepEqual(
      [...nameTags(['new_tag', 'math', 'new_tag'], 'ko')],
      ['new_tag', '수학'],
    );
  });

  it('returns no tags for none', () => {
    assert.deepEqual([...nameTags([], 'ko')], []);
    assert.deepEqual([...nameTags(undefined, 'ko')], []);
  });
});

describe('TAGS', () => {
  it('has a Korean and an English name for each tag', () => {
    TAGS.forEach(([key, korean, english]) => {
      assert.ok(korean?.trim(), `Korean name of ${key}`);
      assert.ok(english?.trim(), `English name of ${key}`);
    });
  });

  it('has no name that Notion cannot take as a multi-select option', () => {
    TAGS.forEach(([key, korean, english]) => {
      assert.ok(!korean.includes(',') && !english.includes(','), key);
    });
  });

  it('gives each key and name to one tag only', () => {
    const owners = new Map();
    TAGS.forEach(([key, ...names]) => {
      [key, ...names].forEach((name) => {
        const term = name.toLowerCase();
        const owner = owners.get(term);
        assert.ok(
          owner === undefined || owner === key,
          `${name} is in ${owner} and ${key}`,
        );
        owners.set(term, key);
      });
    });
  });
});
