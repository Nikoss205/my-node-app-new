'use strict';

/** Типы проектов: ключ (значение флага --type) -> название для вывода. */
const PROJECT_TYPES = {
  web: 'Web-приложение',
  cli: 'CLI-утилита',
  lib: 'Библиотека',
  service: 'Микросервис',
};

/** Дополнительные опции: ключ (имя флага --<ключ>) -> название для вывода. */
const FEATURES = {
  typescript: 'TypeScript',
  eslint: 'ESLint',
  prettier: 'Prettier',
  jest: 'Jest',
};

const NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

/** Возвращает true или текст ошибки (формат, который ожидает inquirer.validate). */
function validateName(value) {
  const name = String(value || '').trim();
  if (!name) return 'Название проекта не может быть пустым';
  if (!NAME_PATTERN.test(name)) return 'Допустимы латинские буквы, цифры, ".", "_" и "-" (начинать нужно с буквы или цифры)';
  return true;
}

module.exports = { PROJECT_TYPES, FEATURES, validateName };
