'use strict';

/**
 * Спиннеры (ora) и прогресс-бары (cli-progress).
 * Всё «украшательство» пишется в stderr и показывается только человеку в терминале.
 */
const ora = require('ora');
const cliProgress = require('cli-progress');

/**
 * Декоративный вывод включается, только если И stdout, И stderr — терминал.
 * Если stdout перенаправлен (> result.json или | jq), программа молчит: принцип "Silence is Golden".
 */
function isDecorated(opts = {}) {
  return Boolean(process.stdout.isTTY && process.stderr.isTTY && !opts.quiet);
}

const noopSpinner = {
  start() { return this; },
  succeed() { return this; },
  fail() { return this; },
  warn() { return this; },
  stop() { return this; },
  set text(_) {},
};

/** Спиннер: зелёная галочка при успехе (succeed), красный крестик при ошибке (fail). */
function createSpinner(text, enabled) {
  if (!enabled) return noopSpinner;
  return ora({ text, stream: process.stderr });
}

function formatEta(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Прогресс-бар: процент, текущий/общий элемент, оставшееся время.
 * Перерисовывается в одной строке (cli-progress использует \r).
 */
function createProgress(total, enabled) {
  if (!enabled) return { start() {}, increment() {}, stop() {} };

  const startedAt = Date.now();
  const bar = new cliProgress.SingleBar(
    {
      format: '[{bar}] {percentage}% | {value}/{total} | ETA: {eta_text}',
      barCompleteChar: '█',
      barIncompleteChar: '░',
      barsize: 20,
      hideCursor: true,
      clearOnComplete: false,
      stopOnComplete: true,
      stream: process.stderr,
    },
    cliProgress.Presets.shades_classic
  );

  // Оставшееся время (сек) = среднее время на элемент * число оставшихся элементов
  const eta = (done) => (done > 0 ? formatEta(((Date.now() - startedAt) / 1000 / done) * (total - done)) : '--:--');
  let done = 0;
  return {
    start() { bar.start(total, 0, { eta_text: '--:--' }); },
    increment() { done += 1; bar.update(done, { eta_text: eta(done) }); },
    stop() { bar.stop(); },
  };
}

module.exports = { isDecorated, createSpinner, createProgress };
