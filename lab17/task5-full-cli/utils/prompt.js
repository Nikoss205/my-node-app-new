'use strict';

const readline = require('node:readline');

/** Вопрос «да/нет» в терминале. Подсказка выводится в stderr (это не данные). */
function confirm(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
    rl.question(question, (answer) => {
      rl.close();
      resolve(/^(y|yes|д|да)$/i.test(answer.trim()));
    });
  });
}

module.exports = { confirm };
