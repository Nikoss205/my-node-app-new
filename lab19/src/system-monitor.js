'use strict';

/**
 * Интеграция с модулем os: периодически собирает показатели системы и эмитит их в EventBus.
 * События: "system:sample" (каждый замер) и "system:alert" (превышение порогов).
 */
const os = require('node:os');

const round = (value, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

function cpuTotals() {
  let busy = 0;
  let idle = 0;
  for (const { times } of os.cpus()) {
    busy += times.user + times.nice + times.sys + times.irq;
    idle += times.idle;
  }
  return { busy, total: busy + idle };
}

function startSystemMonitor(bus, { intervalMs = 5000, firstSampleMs = 1000, cpuAlert = 80, memAlert = 90 } = {}) {
  let prev = cpuTotals();

  function sample() {
    const curr = cpuTotals();
    const totalDiff = curr.total - prev.total;
    const cpu = totalDiff > 0 ? ((curr.busy - prev.busy) / totalDiff) * 100 : 0;
    prev = curr;

    const total = os.totalmem();
    const free = os.freemem();
    const data = {
      host: os.hostname(),
      platform: os.platform(),
      cpu: round(cpu),
      memUsedPercent: round(((total - free) / total) * 100),
      freeGB: round(free / 1024 ** 3, 2),
    };

    bus.emit('system:sample', data);
    if (cpu > cpuAlert) bus.emit('system:alert', { ...data, reason: `CPU ${data.cpu}% > ${cpuAlert}%` });
    if (data.memUsedPercent > memAlert) bus.emit('system:alert', { ...data, reason: `RAM ${data.memUsedPercent}% > ${memAlert}%` });
  }

  const first = setTimeout(sample, firstSampleMs);
  const timer = setInterval(sample, intervalMs);
  first.unref(); // таймеры не удерживают процесс от завершения
  timer.unref();

  return {
    sample,
    stop() {
      clearTimeout(first);
      clearInterval(timer);
    },
  };
}

module.exports = { startSystemMonitor };
