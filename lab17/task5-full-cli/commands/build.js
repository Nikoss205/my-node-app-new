'use strict';

const { log, spinner, printData } = require('../utils/output');
const { readConfig } = require('../services/config');
const { runBuild } = require('../services/build');

/** my-cli build [--config config.json] [--dry-run] */
async function build(opts) {
  const spin = spinner('Сборка проекта...').start();
  try {
    const config = readConfig(opts.config);
    const result = runBuild(config, { dryRun: opts.dryRun });
    spin.stop();

    if (opts.dryRun) {
      log.info(`[dry-run] Будет создан файл ${result.outFile} (из ${result.entry}). Файлы не изменены.`);
      return;
    }
    log.success(`Сборка завершена за ${(result.durationMs / 1000).toFixed(1)}s`);
    printData(`Результат: ${result.outFile}`);
  } catch (err) {
    spin.stop(); // убираем спиннер и отдаём ошибку глобальному обработчику
    throw err;
  }
}

module.exports = build;
