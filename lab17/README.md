# Лабораторная работа №17: Исследование методов создания CLI-приложений

Группа ББМО-01-23. Node.js ≥ 18.

| Папка | Задание | Что используется |
|---|---|---|
| `task1-basic-cli/` | 1. Простое CLI, позиционные аргументы, коды возврата | только Node.js |
| `task2-commander/` | 2. Опции и флаги, `--help`, `--version` | commander |
| `task3-inquirer/` | 3. Интерактивный и неинтерактивный режимы | commander, inquirer |
| `task4-formatting/` | 4. Цвета, спиннеры, прогресс-бары, stdout/stderr | chalk, ora, cli-progress |
| `task5-full-cli/` | 5. Архитектура, ошибки, тесты, упаковка в бинарник | commander, chalk, ora, jest, pkg |

## Подготовка

```bash
cd lab17
# 1) впишите своё ФИО: task1-basic-cli/bin/my-cli.js -> константа STUDENT_FIO
# 2) установите зависимости (задание 1 их не требует):
npm run install:all
```

Запуск любого задания: `node bin/my-cli.js <команда>` из папки задания, либо `npm link` в папке задания — тогда доступна команда `my-cli`
(при переходе к следующему заданию снова выполните `npm link` в его папке).

Код возврата: Linux/macOS — `echo $?`, Windows cmd — `echo %ERRORLEVEL%`, PowerShell — `echo $LASTEXITCODE`.
Если в cmd вместо кириллицы «кракозябры» — выполните `chcp 65001`.

## Задание 1 (`task1-basic-cli`)

```bash
node bin/my-cli.js                # справка
node bin/my-cli.js greet "Иван"   # приветствие
node bin/my-cli.js info           # информация о группе
node bin/my-cli.js unknown        # ошибка, код 1
```

Жизненный цикл в `bin/my-cli.js`: инициализация (константы) → логика (`main` + объект `commands`) → завершение (`process.exitCode`).
Справка и данные идут в stdout, ошибки — в stderr.

## Задание 2 (`task2-commander`)

```bash
node bin/my-cli.js --help
node bin/my-cli.js generate --help
node bin/my-cli.js generate --type pdf --output report.pdf --verbose
node bin/my-cli.js generate --type html --dry-run
node bin/my-cli.js generate --type unknown      # ошибка валидации, код 1
node bin/my-cli.js --version
```

Дополнительно: `convert --input data.csv` (CSV ⇄ JSON), `--force` для перезаписи. Глобальный `--verbose` работает и до, и после имени подкоманды.
В PDF только латиница (кириллица потребовала бы встраивания шрифта).

## Задание 3 (`task3-inquirer`)

```bash
node bin/my-cli.js init                                   # полный диалог: input, list, checkbox, confirm, password
node bin/my-cli.js init --name my-project --type cli --typescript --prettier --git   # без диалога
node bin/my-cli.js init --no-interactive                  # ошибка, код 1
echo "my-project" | node bin/my-cli.js init --no-interactive   # данные из stdin: не хватает --type
```

Вопросы задаются только по недостающим данным. Если stdin — не терминал, интерактивность отключается автоматически.
Токен (password) принимается для демонстрации ввода пароля, не выводится и не сохраняется.
В PowerShell для конвейера: `"my-project" | node bin/my-cli.js init --no-interactive`.

## Задание 4 (`task4-formatting`)

Флаг `--delay 300` — искусственная задержка на файл, чтобы успеть сделать скриншот спиннера и бара.

```bash
node bin/my-cli.js colors                                 # цвета: успех / предупреждение / ошибка / инфо
node bin/my-cli.js colors > colors.txt                    # в файле ANSI-кодов нет (цвета отключились)
node bin/my-cli.js process --files samples/a.txt samples/b.txt samples/c.txt --delay 400   # спиннер
node bin/my-cli.js process --files samples/file1.txt samples/file2.txt samples/file3.txt samples/file4.txt samples/file5.txt samples/file6.txt samples/file7.txt samples/file8.txt samples/file9.txt samples/file10.txt --delay 400   # прогресс-бар
node bin/my-cli.js process --files samples/a.txt missing.txt          # ошибка и предупреждение, код 1
node bin/my-cli.js process --files samples/a.txt missing.txt > result.json   # stdout в файл, stderr виден в терминале
node bin/my-cli.js process --files samples/a.txt > result.json       # Silence is Golden: в терминале пусто
node bin/my-cli.js check --files samples/a.txt                       # молчит, код 0
```

Правила: данные → stdout, логи/ошибки/спиннеры → stderr. Если stdout перенаправлен, «украшения» отключаются.
В терминале без `--output` результат сохраняется в `output.json`, при перенаправлении выводится в stdout.
Показать содержимое файла: `cat result.json` (Windows: `type result.json`).

## Задание 5 (`task5-full-cli`)

```
bin/my-cli.js     точка входа (shebang, глобальные обработчики ошибок)
cli.js            «тонкий» commander: флаги -> объект опций
commands/         init.js, build.js, test.js, deploy.js (оркестрация, вывод)
services/         бизнес-логика (project, config, build, testRunner, deploy)
utils/            output.js (цвета, спиннер), errors.js (ошибки), prompt.js
tests/            services/, utils/, integration/
```

```bash
cd task5-full-cli && npm link          # команда my-cli
my-cli init --name my-app --type cli --install   # --install выполнит npm install (нужен интернет)
cd my-app
my-cli build
my-cli test
my-cli deploy --env production         # запросит подтверждение (y/N); --force пропускает
cd ..
my-cli build                                      # ошибка: нет config.json (без стектрейса)
NODE_ENV=development my-cli build                 # со стектрейсом   (PowerShell: $env:NODE_ENV="development"; my-cli build)
NODE_ENV=production my-cli build                  # кратко
npm test                                          # Jest: юнит + интеграционные тесты
npm run test:coverage
npm run build:bin                                 # автономные бинарники в dist-bin/ (pkg)
./dist-bin/my-cli-linux --version                 # Windows: .\dist-bin\my-cli-win.exe --version
```

Примечания:
- `deploy` — **симуляция** (нет целевого сервера): план, подтверждение и URL настоящие по логике, но обращений к серверам нет.
- `test` запускает `npm test` в текущем проекте и разбирает вывод Jest / node:test.
- Для бинарника используется `@yao-pkg/pkg` (поддерживаемый форк `pkg`, targets Node 22). При первой сборке скачиваются базовые бинарники Node — нужен интернет.
  Если сборка не пошла, можно использовать `nexe`.
- Ошибки: `process.on('uncaughtException')` и `process.on('unhandledRejection')` в `utils/errors.js`; в development — стектрейс, иначе — краткое сообщение; код возврата 1.
