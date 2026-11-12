'use strict';

const ENVIRONMENTS = ['staging', 'production'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Чистая функция: URL развёртывания. */
function buildDeployUrl(name, env) {
  return env === 'production' ? `https://${name}.example.com` : `https://${env}.${name}.example.com`;
}

/** Чистая функция: план развёртывания. */
function getDeployPlan({ name, env }) {
  return { name, env, url: buildDeployUrl(name, env), requiresConfirmation: env === 'production' };
}

/**
 * Чистая функция: как получить подтверждение.
 *  'skip'   — подтверждение не нужно (не production или указан --force)
 *  'ask'    — спросить пользователя (есть интерактивный терминал)
 *  'refuse' — спросить нельзя (stdin не терминал, например CI) и нет --force
 */
function decideConfirmation({ requiresConfirmation, force, isTTY }) {
  if (!requiresConfirmation || force) return 'skip';
  return isTTY ? 'ask' : 'refuse';
}

/**
 * СИМУЛЯЦИЯ развёртывания: реальных обращений к серверам нет (в учебной работе
 * нет целевой инфраструктуры). Возвращает URL, как это сделал бы настоящий деплой.
 */
async function simulateDeploy(plan, { delayMs = 800 } = {}) {
  await sleep(delayMs);
  return plan.url;
}

module.exports = { ENVIRONMENTS, buildDeployUrl, getDeployPlan, decideConfirmation, simulateDeploy };
