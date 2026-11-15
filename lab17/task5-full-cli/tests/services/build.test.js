'use strict';

const path = require('node:path');
const { planBuild, bundleSource } = require('../../services/build');

describe('services/build', () => {
  test('planBuild строит путь dist/<name>.js', () => {
    const plan = planBuild({ name: 'my-app', entry: 'src/index.js', outDir: 'dist' });
    expect(plan.entry).toBe('src/index.js');
    expect(plan.outFile).toBe(path.join('dist', 'my-app.js'));
  });

  test('bundleSource добавляет баннер и сохраняет исходник', () => {
    const out = bundleSource({ name: 'my-app', version: '1.2.3', source: 'console.log(1);' });
    expect(out).toContain('my-app v1.2.3');
    expect(out.endsWith('console.log(1);')).toBe(true);
  });
});
