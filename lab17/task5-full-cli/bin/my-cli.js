#!/usr/bin/env node
'use strict';

/**
 * Точка входа. Здесь только: глобальные обработчики ошибок + запуск commander.
 */
const { registerGlobalHandlers } = require('../utils/errors');

registerGlobalHandlers(); // uncaughtException / unhandledRejection -> понятное сообщение, код 1

const { createProgram } = require('../cli');

// Любая ошибка из команд (в т.ч. async) всплывёт в unhandledRejection и попадёт в общий обработчик.
createProgram().parseAsync(process.argv);
