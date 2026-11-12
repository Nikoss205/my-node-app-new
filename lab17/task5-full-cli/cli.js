'use strict';

/**
 * «Тонкий» слой commander: только описывает команды/флаги и маппит их в объект опций.
 * Вся логика — в commands/ (оркестрация) и services/ (бизнес-логика).
 */
const { Command } = require('commander');
const pkg = require('./package.json');
const commands = require('./commands');

function createProgram() {
  const program = new Command();

  program
    .name('my-cli')
    .description('CLI-приложение группы ББМО-01-23 (лабораторная работа №17)')
    .version(pkg.version, '-V, --version');

  program
    .command('init')
    .description('инициализация проекта')
    .option('-n, --name <name>', 'название проекта')
    .option('-t, --type <type>', 'тип проекта: cli | web | lib | service', 'cli')
    .option('-d, --dir <path>', 'каталог, в котором будет создан проект', '.')
    .option('--no-git', 'не инициализировать Git-репозиторий')
    .option('--install', 'выполнить npm install после создания')
    .action((opts) => commands.init(opts));

  program
    .command('build')
    .description('сборка проекта')
    .option('-c, --config <path>', 'путь к файлу конфигурации', 'config.json')
    .option('--dry-run', 'показать, что будет сделано, не изменяя файлы')
    .action((opts) => commands.build(opts));

  program
    .command('test')
    .description('запуск тестов проекта (npm test)')
    .option('--coverage', 'собрать покрытие кода')
    .action((opts) => commands.test(opts));

  program
    .command('deploy')
    .description('развёртывание проекта (с подтверждением для production)')
    .option('-e, --env <env>', 'окружение: staging | production', 'staging')
    .option('-c, --config <path>', 'путь к файлу конфигурации', 'config.json')
    .option('-f, --force', 'не запрашивать подтверждение')
    .action((opts) => commands.deploy(opts));

  // Неизвестная команда -> сообщение по-русски и код возврата 1
  program.on('command:*', (operands) => {
    process.stderr.write(`✖ Ошибка: неизвестная команда "${operands[0]}"\n`);
    process.stderr.write('Для справки используйте: my-cli --help\n');
    process.exit(1);
  });

  return program;
}

module.exports = { createProgram };
