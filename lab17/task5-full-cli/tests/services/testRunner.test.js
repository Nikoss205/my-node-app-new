'use strict';

const { parseTestOutput } = require('../../services/testRunner');

describe('services/testRunner.parseTestOutput', () => {
  test('разбирает вывод Jest', () => {
    const out = 'Tests:       1 failed, 14 passed, 15 total\nAll files |   87.5 |';
    expect(parseTestOutput(out)).toEqual({ total: 15, passed: 14, failed: 1, coverage: 87.5 });
  });

  test('разбирает вывод node:test (TAP)', () => {
    expect(parseTestOutput('# tests 3\n# pass 3\n# fail 0')).toEqual({ total: 3, passed: 3, failed: 0, coverage: null });
  });

  test('возвращает null для нераспознанного вывода', () => {
    expect(parseTestOutput('что-то другое')).toBeNull();
  });
});
