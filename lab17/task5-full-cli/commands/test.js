'use strict';

const { CliError } = require('../utils/errors');
const { log, spinner, writeErr } = require('../utils/output');
const { runTests } = require('../services/testRunner');

/** my-cli test [--coverage] — запускает `npm test` в текущем проекте. */
async function test(opts) {
  const spin = spinner('Запуск тестов...').start();
  const { code, output, summary } = runTests({ cwd: process.cwd(), coverage: opts.coverage });
  spin.stop();

  if (code !== 0) {
    writeErr(output.trim());
    const hint = summary ? `Не пройдено: ${summary.failed} из ${summary.total}` : undefined;
    throw new CliError('тесты не пройдены', { hint });
  }

  if (summary) {
    log.success(`Пройдено: ${summary.passed}/${summary.total} тестов`);
    if (summary.coverage !== null) log.success(`Покрытие: ${Math.round(summary.coverage)}%`);
  } else {
    log.success('Тесты пройдены');
  }
}

module.exports = test;
