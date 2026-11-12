'use strict';

const inquirer = require('inquirer');
const { PROJECT_TYPES, FEATURES, validateName } = require('./constants');

/**
 * Задаёт вопросы только по тем данным, которые НЕ были переданы флагами.
 * Используются все типы вопросов: input, list, checkbox, confirm, password.
 */
async function askMissing(opts) {
  const featureFlagGiven = Object.keys(FEATURES).some((key) => opts[key]);

  return inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Введите название проекта:',
      when: () => !opts.name,
      validate: validateName,
      filter: (value) => value.trim(),
    },
    {
      type: 'list',
      name: 'type',
      message: 'Выберите тип проекта:',
      when: () => !opts.type,
      choices: Object.entries(PROJECT_TYPES).map(([value, name]) => ({ name, value })),
    },
    {
      type: 'checkbox',
      name: 'features',
      message: 'Выберите дополнительные опции:',
      when: () => !featureFlagGiven,
      choices: Object.entries(FEATURES).map(([value, name]) => ({ name, value })),
    },
    {
      type: 'confirm',
      name: 'git',
      message: 'Использовать Git?',
      default: true,
      when: () => opts.git === undefined,
    },
    {
      type: 'password',
      name: 'token',
      message: 'Введите токен доступа:',
      mask: '*',
      when: () => !opts.token,
    },
  ]);
}

module.exports = { askMissing };
