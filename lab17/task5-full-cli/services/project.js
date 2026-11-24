'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { CliError } = require('../utils/errors');

const PROJECT_TYPES = ['cli', 'web', 'lib', 'service'];
const NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

/** Чистая функция: возвращает текст ошибки или null, если имя корректно. */
function validateProjectName(name) {
  if (!name || !String(name).trim()) return 'не указано название проекта (--name)';
  if (!NAME_PATTERN.test(name)) {
    return `недопустимое название "${name}": только строчные латинские буквы, цифры, ".", "_" и "-"`;
  }
  return null;
}

/** Чистая функция: набор файлов нового проекта { относительный путь: содержимое }. */
function buildProjectFiles({ name, type }) {
  const pkg = {
    name,
    version: '0.1.0',
    description: `Проект "${name}" (${type}), создан my-cli`,
    main: 'src/index.js',
    scripts: { start: 'node src/index.js', test: 'node --test' },
    license: 'MIT',
  };
  const config = { name, type, entry: 'src/index.js', outDir: 'dist' };

  return {
    'package.json': `${JSON.stringify(pkg, null, 2)}\n`,
    'config.json': `${JSON.stringify(config, null, 2)}\n`,
    'src/index.js': [
      "'use strict';",
      '',
      'function greet(who) {',
      '  return `Привет, ${who}!`;',
      '}',
      '',
      'if (require.main === module) {',
      `  console.log(greet('${name}'));`,
      '}',
      '',
      'module.exports = { greet };',
      '',
    ].join('\n'),
    'tests/index.test.js': [
      "'use strict';",
      "const test = require('node:test');",
      "const assert = require('node:assert');",
      "const { greet } = require('../src/index');",
      '',
      "test('greet возвращает приветствие', () => {",
      "  assert.strictEqual(greet('мир'), 'Привет, мир!');",
      '});',
      '',
    ].join('\n'),
    '.gitignore': 'node_modules/\ndist/\n',
    'README.md': `# ${name}\n\nПроект типа "${type}", создан с помощью my-cli.\n`,
  };
}

/** Создаёт проект на диске. Возвращает список созданных файлов и результат git init. */
function createProject({ name, type, baseDir, git = true, install = false }) {
  const dir = path.resolve(baseDir, name);
  if (fs.existsSync(dir)) {
    throw new CliError(`каталог "${dir}" уже существует`, { hint: 'Выберите другое название через --name' });
  }

  const files = buildProjectFiles({ name, type });
  for (const [rel, content] of Object.entries(files)) {
    const target = path.join(dir, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }

  const result = { dir, files: Object.keys(files), git: null, installed: false };
  if (git) result.git = run('git', ['init', '-q'], dir);
  if (install) result.installed = run('npm', ['install', '--no-audit', '--no-fund'], dir);
  return result;
}

/** Запуск внешней команды; возвращает true/false (git/npm могут быть не установлены). */
function run(cmd, args, cwd) {
  const res = spawnSync(cmd, args, { cwd, stdio: 'ignore', shell: process.platform === 'win32' });
  return res.status === 0;
}

module.exports = { PROJECT_TYPES, validateProjectName, buildProjectFiles, createProject };
