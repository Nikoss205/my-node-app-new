'use strict';

const fs = require('node:fs');
const { CliError } = require('../utils/errors');

const DEFAULTS = { entry: 'src/index.js', outDir: 'dist' };

/** Чистая функция: разбор и проверка текста конфигурации (без ввода-вывода). */
function parseConfig(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new CliError('config.json содержит некорректный JSON', { details: e.message, cause: e });
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new CliError('config.json должен содержать JSON-объект');
  }
  if (typeof data.name !== 'string' || !data.name.trim()) {
    throw new CliError('в config.json не указано поле "name"');
  }
  return { ...DEFAULTS, ...data };
}

/**
 * Читает конфигурацию с диска.
 * Ошибка ENOENT (файла нет) намеренно НЕ перехватывается: она всплывёт до глобального
 * обработчика, который в production покажет краткое сообщение, а в development — стектрейс.
 */
function readConfig(configPath = 'config.json') {
  const raw = fs.readFileSync(configPath, 'utf8');
  return parseConfig(raw);
}

module.exports = { parseConfig, readConfig, DEFAULTS };
