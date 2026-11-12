'use strict';

const path = require('node:path');
const { colors, writeErr } = require('./output');

/** Ожидаемая (пользовательская) ошибка: понятное сообщение, подсказка, код возврата. */
class CliError extends Error {
  constructor(message, { hint, details, exitCode = 1, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'CliError';
    this.hint = hint;
    this.details = details;
    this.exitCode = exitCode;
  }
}

/** Превращает системные/неожиданные ошибки в понятное описание. */
function describe(err) {
  if (err instanceof CliError) {
    return { message: err.message, hint: err.hint, details: err.details };
  }
  if (err && err.code === 'ENOENT' && err.path) {
    const base = path.basename(err.path);
    return {
      message: `файл ${err.path} не найден`,
      hint: base === 'config.json' ? 'Укажите путь через --config' : undefined,
      details: `${base} отсутствует в ${path.dirname(path.resolve(err.path))}`,
    };
  }
  return { message: err && err.message ? err.message : String(err) };
}

/**
 * Формирует строки сообщения об ошибке (без цветов — удобно тестировать).
 *  - NODE_ENV=development: исходное сообщение + стектрейс;
 *  - иначе (production и по умолчанию): краткое сообщение, подсказка и подробности, без стектрейса.
 * Первая строка — заголовок (перед ним выводится ✖).
 */
function formatError(error, env = process.env.NODE_ENV) {
  const err = error instanceof Error ? error : new Error(String(error));

  if (env === 'development') {
    const stack = (err.stack || '').split('\n').slice(1);
    return [`Ошибка: ${err.message}`, ...stack];
  }

  const { message, hint, details } = describe(err);
  return [`Ошибка: ${message}`, hint, details ? `Подробности: ${details}` : null].filter(Boolean);
}

let handling = false;

/** Единая точка обработки фатальных ошибок: сообщение в stderr и код возврата 1. */
function handleError(error) {
  if (handling) return; // защита от рекурсии, если сам обработчик упал
  handling = true;
  const [title, ...rest] = formatError(error);
  writeErr(colors.red(`✖ ${title}`));
  rest.forEach((line) => writeErr(line));
  const code = error && Number.isInteger(error.exitCode) ? error.exitCode : 1;
  handling = false;
  process.exit(code);
}

function registerGlobalHandlers() {
  process.on('uncaughtException', handleError);
  process.on('unhandledRejection', handleError);
}

module.exports = { CliError, formatError, handleError, registerGlobalHandlers };
