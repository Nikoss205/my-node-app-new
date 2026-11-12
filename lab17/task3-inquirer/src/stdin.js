'use strict';

/**
 * Читает данные, переданные через конвейер: echo "my-project" | my-cli init ...
 * Если данные не пришли за timeoutMs (stdin открыт, но пуст) — возвращает пустую строку,
 * чтобы программа не зависала, например, в CI.
 */
function readStdin({ timeoutMs = 1500 } = {}) {
  return new Promise((resolve) => {
    let data = '';
    const stdin = process.stdin;

    const finish = () => {
      clearTimeout(timer);
      stdin.removeListener('data', onData);
      stdin.removeListener('end', finish);
      stdin.removeListener('error', finish);
      stdin.destroy();
      resolve(data);
    };
    const onData = (chunk) => {
      data += chunk;
    };
    const timer = setTimeout(finish, timeoutMs);

    stdin.setEncoding('utf8');
    stdin.on('data', onData);
    stdin.on('end', finish);
    stdin.on('error', finish);
  });
}

/** Первая непустая строка введённых данных. */
function firstLine(text) {
  return (text || '').split(/\r?\n/).map((s) => s.trim()).find(Boolean) || '';
}

module.exports = { readStdin, firstLine };
