'use strict';

/**
 * Цветной вывод (chalk). Цвета отключаются автоматически, если поток не является
 * терминалом (вывод перенаправлен в файл или в конвейер) — проверка isTTY — либо задана NO_COLOR.
 */
const chalk = require('chalk');

function chalkFor(stream) {
  if (!stream.isTTY || 'NO_COLOR' in process.env) return new chalk.Instance({ level: 0 });
  return stream === process.stderr ? chalk.stderr : chalk;
}

const colorOut = chalkFor(process.stdout); // для данных (stdout)
const colorErr = chalkFor(process.stderr); // для логов (stderr)

/**
 * Логи, предупреждения и ошибки — в stderr, чтобы не смешиваться с данными в stdout.
 * Успех — зелёный, предупреждение — жёлтый, ошибка — красный, информация — синий.
 */
const log = {
  success: (msg) => console.error(colorErr.green(`✔ ${msg}`)),
  warn: (msg) => console.error(colorErr.yellow(`⚠ ${msg}`)),
  error: (msg) => console.error(colorErr.red(`✖ ${msg}`)),
  info: (msg) => console.error(colorErr.blue(`ℹ ${msg}`)),
};

/** Склонение: plural(3, ['файл', 'файла', 'файлов']) -> "3 файла" */
function plural(n, forms) {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  let form = forms[2];
  if (abs < 11 || abs > 14) {
    if (last === 1) form = forms[0];
    else if (last >= 2 && last <= 4) form = forms[1];
  }
  return `${n} ${form}`;
}

module.exports = { colorOut, colorErr, log, plural };
