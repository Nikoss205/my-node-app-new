'use strict';

/** Разбор CSV (поддерживает кавычки, запятые и переводы строк внутри полей). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

function csvToJson(text) {
  const [header, ...rest] = parseCsv(text);
  if (!header) return '[]\n';
  const items = rest.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
  return JSON.stringify(items, null, 2) + '\n';
}

function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function jsonToCsv(text) {
  const data = JSON.parse(text);
  const items = Array.isArray(data) ? data : [data];
  const header = [...new Set(items.flatMap((o) => Object.keys(o)))];
  const lines = [header.join(','), ...items.map((o) => header.map((h) => csvCell(o[h])).join(','))];
  return lines.join('\n') + '\n';
}

const SUPPORTED_FORMATS = ['json', 'csv'];

function convert(text, from, to) {
  if (from === to) return text;
  if (from === 'csv' && to === 'json') return csvToJson(text);
  if (from === 'json' && to === 'csv') return jsonToCsv(text);
  throw new Error(`Конвертация ${from} -> ${to} не поддерживается`);
}

module.exports = { SUPPORTED_FORMATS, convert, parseCsv };
