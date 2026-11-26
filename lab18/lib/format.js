'use strict';

/** Номер группы — выводится в отчётах и в monitor.log. */
const GROUP = 'ББМО-01-23';

const GB = 1024 ** 3;

/** Байты -> гигабайты (двоичные, 1 ГБ = 1024^3 байт), число. */
const bytesToGB = (bytes) => bytes / GB;

/** Байты -> строка с двумя знаками: 15.89 */
const formatGB = (bytes) => bytesToGB(bytes).toFixed(2);

/** Секунды -> "3 ч 25 мин 12 сек" (при необходимости с днями: "2 д 3 ч ..."). */
function formatUptime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const parts = [];
  if (days > 0) parts.push(`${days} д`);
  parts.push(`${hours} ч`, `${minutes} мин`, `${seconds} сек`);
  return parts.join(' ');
}

/**
 * Маскирует MAC-адрес: первые три октета (производитель) остаются,
 * последние три (уникальная часть устройства) скрываются.
 * "aa:bb:cc:11:22:33" -> "AA:BB:CC:**:**:**"
 */
function maskMac(mac) {
  const octets = String(mac || '').split(/[:-]/);
  if (octets.length !== 6) return '**:**:**:**:**:**';
  return octets.map((o, i) => (i < 3 ? o.toUpperCase() : '**')).join(':');
}

const pad2 = (n) => String(n).padStart(2, '0');

/** Date -> "YYYY-MM-DD HH:MM:SS" (локальное время). */
function formatTimestamp(date = new Date()) {
  return (
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ` +
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
  );
}

/** Округление до n знаков (число, а не строка). */
const round = (value, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

module.exports = { GROUP, bytesToGB, formatGB, formatUptime, maskMac, formatTimestamp, round };
