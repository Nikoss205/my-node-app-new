'use strict';

const { CliError } = require('../utils/errors');
const { log, spinner, printData } = require('../utils/output');
const { confirm } = require('../utils/prompt');
const { readConfig } = require('../services/config');
const { ENVIRONMENTS, getDeployPlan, decideConfirmation, simulateDeploy } = require('../services/deploy');

/** my-cli deploy --env production [--force] */
async function deploy(opts) {
  if (!ENVIRONMENTS.includes(opts.env)) {
    throw new CliError(`недопустимое окружение "${opts.env}"`, { hint: `Допустимые значения: ${ENVIRONMENTS.join(', ')}` });
  }

  const config = readConfig(opts.config);
  const plan = getDeployPlan({ name: config.name, env: opts.env });

  const decision = decideConfirmation({
    requiresConfirmation: plan.requiresConfirmation,
    force: opts.force,
    isTTY: Boolean(process.stdin.isTTY),
  });

  if (decision === 'refuse') {
    throw new CliError('развёртывание в production требует подтверждения', {
      hint: 'Запустите команду в терминале или добавьте флаг --force',
    });
  }
  if (decision === 'ask') {
    log.warn('Вы собираетесь развернуть проект в production!');
    if (!(await confirm('Продолжить? (y/N) '))) {
      log.info('Развёртывание отменено');
      process.exitCode = 1;
      return;
    }
  }

  const spin = spinner('Развёртывание...').start();
  try {
    const url = await simulateDeploy(plan);
    spin.succeed('Развёрнуто успешно');
    printData(`URL: ${url}`);
  } catch (err) {
    spin.fail('Развёртывание не удалось');
    throw err;
  }
}

module.exports = deploy;
