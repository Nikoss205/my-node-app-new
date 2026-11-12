'use strict';

/**
 * Интеграционные тесты: настоящий запуск CLI в дочернем процессе (child_process.spawnSync).
 * Проверяем вывод --help / --version, коды возврата, поведение команд.
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const pkg = require('../../package.json');

const BIN = path.join(__dirname, '..', '..', 'bin', 'my-cli.js');

function run(args, { cwd, env = {} } = {}) {
  const res = spawnSync(process.execPath, [BIN, ...args], {
    cwd,
    encoding: 'utf8',
    input: '', // stdin — закрытый конвейер (не TTY), как в CI
    env: { ...process.env, NO_COLOR: '1', ...env },
  });
  return { code: res.status, stdout: res.stdout, stderr: res.stderr };
}

let tmp;
let project;

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'my-cli-test-'));
  const res = run(['init', '--name', 'demo-app', '--type', 'cli', '--no-git', '--dir', tmp]);
  expect(res.code).toBe(0);
  project = path.join(tmp, 'demo-app');
});

afterAll(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('общие команды', () => {
  test('--help выводит справку', () => {
    const res = run(['--help']);
    expect(res.code).toBe(0);
    expect(res.stdout).toContain('Usage: my-cli');
    for (const cmd of ['init', 'build', 'test', 'deploy']) expect(res.stdout).toContain(cmd);
  });

  test('--version выводит версию из package.json', () => {
    const res = run(['--version']);
    expect(res.code).toBe(0);
    expect(res.stdout.trim()).toBe(pkg.version);
  });

  test('неизвестная команда возвращает код 1', () => {
    const res = run(['unknown']);
    expect(res.code).toBe(1);
    expect(res.stderr).toContain('неизвестная команда "unknown"');
  });
});

describe('init', () => {
  test('создаёт файлы проекта', () => {
    for (const file of ['package.json', 'config.json', 'src/index.js']) {
      expect(fs.existsSync(path.join(project, file))).toBe(true);
    }
  });

  test('повторный init в тот же каталог — ошибка с кодом 1', () => {
    const res = run(['init', '--name', 'demo-app', '--no-git', '--dir', tmp]);
    expect(res.code).toBe(1);
    expect(res.stderr).toContain('уже существует');
  });

  test('недопустимое имя — код 1', () => {
    const res = run(['init', '--name', 'Bad Name', '--dir', tmp]);
    expect(res.code).toBe(1);
  });
});

describe('build', () => {
  test('--dry-run не изменяет файлы', () => {
    const res = run(['build', '--dry-run'], { cwd: project });
    expect(res.code).toBe(0);
    expect(fs.existsSync(path.join(project, 'dist'))).toBe(false);
  });

  test('сборка создаёт dist/<name>.js', () => {
    const res = run(['build'], { cwd: project });
    expect(res.code).toBe(0);
    expect(res.stdout).toContain('dist');
    expect(fs.existsSync(path.join(project, 'dist', 'demo-app.js'))).toBe(true);
  });

  test('без config.json: код 1, краткое сообщение без стектрейса (production)', () => {
    const res = run(['build'], { cwd: tmp, env: { NODE_ENV: 'production' } });
    expect(res.code).toBe(1);
    expect(res.stderr).toContain('файл config.json не найден');
    expect(res.stderr).not.toMatch(/\n\s+at /);
  });

  test('без config.json: в development есть стектрейс', () => {
    const res = run(['build'], { cwd: tmp, env: { NODE_ENV: 'development' } });
    expect(res.code).toBe(1);
    expect(res.stderr).toContain('ENOENT');
    expect(res.stderr).toMatch(/\n\s+at /);
  });
});

describe('test', () => {
  test('запускает тесты проекта и сообщает результат', () => {
    const res = run(['test'], { cwd: project });
    expect(res.code).toBe(0);
    expect(res.stderr).toContain('Пройдено: 1/1');
  });
});

describe('deploy', () => {
  test('staging не требует подтверждения', () => {
    const res = run(['deploy'], { cwd: project });
    expect(res.code).toBe(0);
    expect(res.stdout).toContain('https://staging.demo-app.example.com');
  });

  test('production без --force и без терминала — код 1', () => {
    const res = run(['deploy', '--env', 'production'], { cwd: project });
    expect(res.code).toBe(1);
    expect(res.stderr).toContain('требует подтверждения');
  });

  test('production с --force — успех', () => {
    const res = run(['deploy', '--env', 'production', '--force'], { cwd: project });
    expect(res.code).toBe(0);
    expect(res.stdout).toContain('https://demo-app.example.com');
  });
});
