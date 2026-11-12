'use strict';

const { buildDeployUrl, getDeployPlan, decideConfirmation } = require('../../services/deploy');

describe('services/deploy', () => {
  test('buildDeployUrl для production и staging', () => {
    expect(buildDeployUrl('my-app', 'production')).toBe('https://my-app.example.com');
    expect(buildDeployUrl('my-app', 'staging')).toBe('https://staging.my-app.example.com');
  });

  test('getDeployPlan: подтверждение нужно только для production', () => {
    expect(getDeployPlan({ name: 'a', env: 'production' }).requiresConfirmation).toBe(true);
    expect(getDeployPlan({ name: 'a', env: 'staging' }).requiresConfirmation).toBe(false);
  });

  test('decideConfirmation: без подтверждения для staging', () => {
    expect(decideConfirmation({ requiresConfirmation: false, force: false, isTTY: false })).toBe('skip');
  });

  test('decideConfirmation: --force пропускает подтверждение', () => {
    expect(decideConfirmation({ requiresConfirmation: true, force: true, isTTY: false })).toBe('skip');
  });

  test('decideConfirmation: в терминале спрашиваем, без терминала отказываем', () => {
    expect(decideConfirmation({ requiresConfirmation: true, force: false, isTTY: true })).toBe('ask');
    expect(decideConfirmation({ requiresConfirmation: true, force: false, isTTY: false })).toBe('refuse');
  });
});
