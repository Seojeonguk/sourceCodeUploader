import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createProblemPageData,
  getCodeLanguage,
} from '../../scripts/notion/objects/problemPage.js';

const names = (property) => property.multi_select.map(({ name }) => name);

const programmersProblem = {
  databaseId: 'database-id',
  type: 'Programmers',
  problemId: '1845',
  title: '폰켓몬',
  level: 'Lv. 1',
  tags: ['해시'],
  url: 'https://school.programmers.co.kr/learn/courses/30/lessons/1845',
  extension: 'py',
  sourceCode: 'def solution(nums):\n    return 0',
  createdAt: new Date('2026-10-12T00:00:00Z'),
};

describe('getCodeLanguage', () => {
  it('maps file extensions to Notion code languages', () => {
    assert.equal(getCodeLanguage('py'), 'python');
    assert.equal(getCodeLanguage('java'), 'java');
    assert.equal(getCodeLanguage('cpp'), 'c++');
    assert.equal(getCodeLanguage('cs'), 'c#');
    assert.equal(getCodeLanguage('kt'), 'kotlin');
    assert.equal(getCodeLanguage('JS'), 'javascript');
  });

  it('falls back to plain text', () => {
    assert.equal(getCodeLanguage('txt'), 'plain text');
    assert.equal(getCodeLanguage(undefined), 'plain text');
  });
});

describe('createProblemPageData', () => {
  it('creates the page in the selected database', () => {
    assert.deepEqual(createProblemPageData(programmersProblem).parent, {
      database_id: 'database-id',
    });
  });

  it('uses the problem info from the page', () => {
    const { properties } = createProblemPageData(programmersProblem);

    assert.equal(properties.title.title[0].text.content, '폰켓몬');
    assert.deepEqual(names(properties.info), ['Programmers', 'Lv. 1', '1845']);
    assert.deepEqual(names(properties.tags), ['해시']);
    assert.equal(properties.URL.url, programmersProblem.url);
    assert.equal(properties.mime.select.name, 'py');
  });

  it('sets the code block language from the extension (not always java)', () => {
    const { children } = createProblemPageData(programmersProblem);
    const codeBlock = children.find((block) => block.type === 'code');

    assert.equal(codeBlock.code.language, 'python');
    assert.equal(
      codeBlock.code.rich_text.map((text) => text.text.content).join(''),
      programmersProblem.sourceCode,
    );
  });

  it('leaves out an empty level', () => {
    const { properties } = createProblemPageData({
      ...programmersProblem,
      level: null,
    });

    assert.deepEqual(names(properties.info), ['Programmers', '1845']);
  });

  it('defaults to the BOJ problem URL', () => {
    const { properties } = createProblemPageData({
      ...programmersProblem,
      type: 'BOJ',
      problemId: '1000',
      url: undefined,
    });

    assert.equal(properties.URL.url, 'acmicpc.net/problem/1000');
  });
});
