#!/usr/bin/env node
'use strict';

/**
 * Задание 1 (базовый уровень): CLI без внешних библиотек.
 * Жизненный цикл: инициализация -> логика -> завершение с кодом возврата.
 */

// ---------- 1. Инициализация: константы приложения ----------
const APP_NAME = 'my-cli';
const GROUP = 'ББМО-01-23';
const LAB_NUMBER = 17;
// TODO: впишите своё ФИО (или задайте переменной окружения STUDENT_FIO)
const STUDENT_FIO = process.env.STUDENT_FIO || 'Шикель Никита Владимирович';

const EXIT_OK = 0;
const EXIT_ERROR = 1;

// ---------- Вывод ----------
const out = (text) => process.stdout.write(text + '\n'); // данные  -> stdout
const err = (text) => process.stderr.write(text + '\n'); // ошибки  -> stderr

function printHelp() {
  out(`Использование: ${APP_NAME} <команда> [аргументы]`);
  out('');
  out('Доступные команды:');
  out('  greet <имя>   - поприветствовать пользователя');
  out('  info          - вывести информацию о группе');
}

// ---------- 2. Логика: команды ----------
const commands = {
  greet(args) {
    const name = args.join(' ').trim();
    if (!name) {
      err('Ошибка: не указано имя');
      err(`Использование: ${APP_NAME} greet <имя>`);
      return EXIT_ERROR;
    }
    out(`Привет, ${name}! Добро пожаловать в CLI-приложение группы ${GROUP}.`);
    return EXIT_OK;
  },

  info() {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    out(`Группа: ${GROUP}`);
    out(`Студент: ${STUDENT_FIO}`);
    out(`Лабораторная работа: №${LAB_NUMBER}`);
    out(`Дата: ${today}`);
    return EXIT_OK;
  },
};

function main(argv) {
  const [command, ...args] = argv;

  // Без аргументов (или с --help) — справка
  if (command === undefined || command === '--help' || command === '-h') {
    printHelp();
    return EXIT_OK;
  }

  const handler = Object.prototype.hasOwnProperty.call(commands, command)
    ? commands[command]
    : null;

  if (!handler) {
    err(`Ошибка: неизвестная команда "${command}"`);
    err(`Для справки используйте: ${APP_NAME} --help`);
    return EXIT_ERROR;
  }

  return handler(args);
}

// ---------- 3. Завершение: код возврата ----------
// process.exitCode (а не process.exit) — чтобы stdout гарантированно успел сброситься
process.exitCode = main(process.argv.slice(2));
