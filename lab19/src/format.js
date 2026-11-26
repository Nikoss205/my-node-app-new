'use strict';

/**
 * Склонение по числу: plural(3, ['раз', 'раза', 'раз']) -> "3 раза".
 * forms = [для 1, для 2–4, для 5+ (и 11–14)]
 */
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

const times = (n) => plural(n, ['раз', 'раза', 'раз']);
const calls = (n) => plural(n, ['вызов', 'вызова', 'вызовов']);
const errorsWord = (n) => plural(n, ['ошибка', 'ошибки', 'ошибок']);
const records = (n) => plural(n, ['запись', 'записи', 'записей']);

module.exports = { plural, times, calls, errorsWord, records };
