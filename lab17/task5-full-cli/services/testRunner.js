'use strict';

const { spawnSync } = require('node:child_process');

/**
 * Чистая функция: разбор вывода тест-раннера (Jest или node:test).
 * Возвращает { total, passed, failed, coverage } или null, если формат не распознан.
 */
function parseTestOutput(text) {
  let total;
  let passed;
  let failed = 0;

  // Jest: "Tests:       1 failed, 14 passed, 15 total"
  const jest = text.match(/Tests:\s+(?:(\d+) failed,\s*)?(?:(\d+) skipped,\s*)?(?:(\d+) passed,\s*)?(\d+) total/);
  if (jest) {
    failed = Number(jest[1] || 0);
    passed = Number(jest[3] || 0);
    total = Number(jest[4]);
  } else {
    // node:test: "ℹ tests 3", "ℹ pass 3", "ℹ fail 0" (или "# tests 3" в TAP)
    const t = text.match(/(?:#|ℹ)\s*tests\s+(\d+)/);
    const p = text.match(/(?:#|ℹ)\s*pass\s+(\d+)/);
    const f = text.match(/(?:#|ℹ)\s*fail\s+(\d+)/);
    if (!t) return null;
    total = Number(t[1]);
    passed = p ? Number(p[1]) : 0;
    failed = f ? Number(f[1]) : 0;
  }

  const cov = text.match(/All files\s*\|\s*([\d.]+)/);
  return { total, passed, failed, coverage: cov ? Number(cov[1]) : null };
}

/** Запускает `npm test` в каталоге проекта. */
function runTests({ cwd = process.cwd(), coverage = false } = {}) {
  const args = ['test', '--silent'];
  if (coverage) args.push('--', '--coverage');
  const res = spawnSync('npm', args, { cwd, encoding: 'utf8', shell: process.platform === 'win32' });
  const output = `${res.stdout || ''}\n${res.stderr || ''}`;
  return { code: res.status === null ? 1 : res.status, output, summary: parseTestOutput(output) };
}

module.exports = { parseTestOutput, runTests };
