'use strict';

// Явные require (а не чтение каталога), чтобы упаковщик pkg видел все файлы.
module.exports = {
  init: require('./init'),
  build: require('./build'),
  test: require('./test'),
  deploy: require('./deploy'),
};
