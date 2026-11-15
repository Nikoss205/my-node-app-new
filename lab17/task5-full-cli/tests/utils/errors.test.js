'use strict';

const { CliError, formatError, handleError } = require('../../utils/errors');

function enoent() {
  const err = new Error("ENOENT: no such file or directory, open 'config.json'");
  err.code = 'ENOENT';
  err.path = 'config.json';
  return err;
}

describe('utils/errors: условная логика по NODE_ENV', () => {
  test('production: краткое сообщение без стектрейса', () => {
    const lines = formatError(enoent(), 'production');
    expect(lines[0]).toBe('Ошибка: файл config.json не найден');
    expect(lines).toContain('Укажите путь через --config');
    expect(lines.join('\n')).not.toMatch(/\n\s+at /);
  });

  test('development: исходное сообщение и стектрейс', () => {
    const lines = formatError(enoent(), 'development');
    expect(lines[0]).toContain('ENOENT');
    expect(lines.some((l) => l.trim().startsWith('at '))).toBe(true);
  });

  test('CliError: сообщение и подсказка', () => {
    const lines = formatError(new CliError('что-то не так', { hint: 'сделайте так' }), 'production');
    expect(lines).toEqual(['Ошибка: что-то не так', 'сделайте так']);
  });

  test('не-Error (например, строка из unhandledRejection) обрабатывается', () => {
    expect(formatError('сломалось', 'production')[0]).toBe('Ошибка: сломалось');
  });
});

describe('utils/errors.handleError: перехват process.exit', () => {
  let exitSpy;
  let stderrSpy;

  beforeEach(() => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  test('пишет сообщение в stderr и завершает процесс с кодом 1', () => {
    handleError(new Error('авария'));
    const written = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(written).toContain('Ошибка: авария');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('использует exitCode из CliError', () => {
    handleError(new CliError('отмена', { exitCode: 2 }));
    expect(exitSpy).toHaveBeenCalledWith(2);
  });
});
