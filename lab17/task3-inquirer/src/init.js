'use strict';

const { PROJECT_TYPES, FEATURES, validateName } = require('./constants');
const { readStdin, firstLine } = require('./stdin');

/** Ошибка пользователя: сообщение -> stderr, код возврата 1. */
function fail(message) {
  console.error(`Ошибка: ${message}`);
  process.exit(1);
}

/**
 * Логика команды `init`.
 *  1. Если все обязательные данные (--name и --type) переданы флагами — диалог не запускается.
 *  2. Иначе задаются вопросы (inquirer) — только по недостающим данным.
 *  3. --no-interactive, а также передача данных через stdin отключают диалог.
 */
async function runInit(opts) {
  // Валидация флагов
  if (opts.type && !PROJECT_TYPES[opts.type]) {
    fail(`недопустимый тип проекта "${opts.type}". Допустимые значения: ${Object.keys(PROJECT_TYPES).join(', ')}`);
  }
  if (opts.name && validateName(opts.name) !== true) fail(validateName(opts.name));

  // Интерактивность выключена флагом или автоматически, если stdin — не терминал (конвейер)
  const stdinIsPipe = !process.stdin.isTTY;
  const nonInteractive = opts.interactive === false || stdinIsPipe;

  // Данные из конвейера: первая строка считается названием проекта
  let piped = '';
  if (stdinIsPipe && (!opts.name || !opts.type)) {
    piped = firstLine(await readStdin());
    if (piped && !opts.name) {
      if (validateName(piped) !== true) fail(validateName(piped));
      opts.name = piped;
    }
  }

  const missing = [];
  if (!opts.name) missing.push('--name');
  if (!opts.type) missing.push('--type');

  let answers = {};
  if (missing.length > 0) {
    if (nonInteractive) {
      if (piped) fail(`недостаточно данных. Укажите ${missing.join(', ')}`);
      fail(`в неинтерактивном режиме необходимо указать ${missing.join(' и ')}`);
    }
    // inquirer подключаем лениво: в неинтерактивном режиме он не нужен
    const { askMissing } = require('./prompts');
    answers = await askMissing(opts);
  }

  // Итоговая конфигурация: флаги + ответы на вопросы
  const name = opts.name || answers.name;
  const type = opts.type || answers.type;
  const features = Object.keys(FEATURES).filter((key) =>
    answers.features ? answers.features.includes(key) : opts[key]
  );
  const git = opts.git !== undefined ? opts.git : Boolean(answers.git);
  // Токен (answers.token / --token) принимается для демонстрации ввода пароля: не выводится и не сохраняется.

  console.log(`✓ Проект "${name}" успешно инициализирован!`);
  console.log(`Тип: ${PROJECT_TYPES[type]}`);
  console.log(`Опции: ${features.length ? features.map((k) => FEATURES[k]).join(', ') : 'нет'}`);
  console.log(`Git: ${git ? 'да' : 'нет'}`);
}

module.exports = { runInit };
