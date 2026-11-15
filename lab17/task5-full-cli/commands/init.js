'use strict';

const { CliError } = require('../utils/errors');
const { log, spinner } = require('../utils/output');
const { PROJECT_TYPES, validateProjectName, createProject } = require('../services/project');

/** my-cli init --name my-app --type cli */
async function init(opts) {
  const problem = validateProjectName(opts.name);
  if (problem) throw new CliError(problem, { hint: 'Пример: my-cli init --name my-app --type cli' });
  if (!PROJECT_TYPES.includes(opts.type)) {
    throw new CliError(`недопустимый тип проекта "${opts.type}"`, { hint: `Допустимые значения: ${PROJECT_TYPES.join(', ')}` });
  }

  const spin = spinner('Создание проекта...').start();
  let result;
  try {
    result = createProject({ name: opts.name, type: opts.type, baseDir: opts.dir, git: opts.git, install: opts.install });
  } catch (err) {
    spin.stop();
    throw err;
  }
  spin.stop();

  log.success(`Проект "${opts.name}" создан (${result.files.length} файлов)`);
  if (opts.install) {
    if (result.installed) log.success('Установлены зависимости');
    else log.warn('Не удалось выполнить npm install');
  }
  if (opts.git) {
    if (result.git) log.success('Инициализирован Git-репозиторий');
    else log.warn('Git-репозиторий не создан (git не найден?)');
  }
  log.plain('Проект готов к работе!');
}

module.exports = init;
