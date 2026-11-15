'use strict';

const { validateProjectName, buildProjectFiles, PROJECT_TYPES } = require('../../services/project');

describe('services/project (чистая логика, без ввода-вывода)', () => {
  test('validateProjectName принимает корректное имя', () => {
    expect(validateProjectName('my-app')).toBeNull();
    expect(validateProjectName('app.v2_test')).toBeNull();
  });

  test('validateProjectName отклоняет пустое имя', () => {
    expect(validateProjectName('')).toContain('не указано');
    expect(validateProjectName(undefined)).toContain('не указано');
  });

  test('validateProjectName отклоняет недопустимые символы', () => {
    expect(validateProjectName('My App')).toContain('недопустимое название');
    expect(validateProjectName('-start')).toContain('недопустимое название');
  });

  test('buildProjectFiles возвращает ожидаемый набор файлов', () => {
    const files = buildProjectFiles({ name: 'my-app', type: 'cli' });
    expect(Object.keys(files).sort()).toEqual(
      ['.gitignore', 'README.md', 'config.json', 'package.json', 'src/index.js', 'tests/index.test.js'].sort()
    );
  });

  test('buildProjectFiles подставляет имя и тип в package.json и config.json', () => {
    const files = buildProjectFiles({ name: 'demo', type: 'lib' });
    expect(JSON.parse(files['package.json']).name).toBe('demo');
    expect(JSON.parse(files['config.json'])).toEqual({ name: 'demo', type: 'lib', entry: 'src/index.js', outDir: 'dist' });
  });

  test('PROJECT_TYPES содержит cli', () => {
    expect(PROJECT_TYPES).toContain('cli');
  });
});
