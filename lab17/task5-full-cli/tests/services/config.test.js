'use strict';

const { parseConfig } = require('../../services/config');
const { CliError } = require('../../utils/errors');

describe('services/config', () => {
  test('parseConfig добавляет значения по умолчанию', () => {
    expect(parseConfig('{"name":"app"}')).toEqual({ name: 'app', entry: 'src/index.js', outDir: 'dist' });
  });

  test('parseConfig сохраняет пользовательские значения', () => {
    const cfg = parseConfig('{"name":"app","outDir":"build"}');
    expect(cfg.outDir).toBe('build');
  });

  test('parseConfig бросает CliError при некорректном JSON', () => {
    expect(() => parseConfig('{oops')).toThrow(CliError);
  });

  test('parseConfig требует поле name', () => {
    expect(() => parseConfig('{}')).toThrow('не указано поле "name"');
  });
});
