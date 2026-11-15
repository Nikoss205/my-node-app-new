'use strict';

const fs = require('node:fs');
const path = require('node:path');

/** Чистая функция: план сборки (откуда и куда). */
function planBuild(config) {
  return {
    entry: config.entry,
    outFile: path.join(config.outDir, `${config.name}.js`),
  };
}

/** Чистая функция: итоговое содержимое бандла (баннер + исходник). */
function bundleSource({ name, version, source }) {
  const banner = `/*! ${name}${version ? ` v${version}` : ''} | собрано my-cli */\n`;
  return banner + source;
}

/** Выполняет сборку: читает entry, пишет dist/<name>.js. При dryRun файлы не изменяются. */
function runBuild(config, { cwd = process.cwd(), dryRun = false } = {}) {
  const started = process.hrtime.bigint();
  const plan = planBuild(config);
  const source = fs.readFileSync(path.resolve(cwd, plan.entry), 'utf8'); // ENOENT пробрасывается
  const content = bundleSource({ name: config.name, version: config.version, source });

  if (!dryRun) {
    const target = path.resolve(cwd, plan.outFile);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }

  const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
  return { ...plan, bytes: Buffer.byteLength(content), durationMs };
}

module.exports = { planBuild, bundleSource, runBuild };
