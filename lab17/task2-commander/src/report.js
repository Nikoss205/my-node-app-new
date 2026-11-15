'use strict';

/** Допустимые типы отчёта. */
const REPORT_TYPES = ['html', 'pdf', 'json', 'csv'];

function collectData() {
  return {
    title: 'Отчёт по лабораторной работе №17',
    group: 'ББМО-01-23',
    generatedAt: new Date().toISOString(),
    tasks: [
      { id: 1, title: 'Простое CLI-приложение', level: 'базовый' },
      { id: 2, title: 'Опции и флаги (commander)', level: 'средний' },
      { id: 3, title: 'Интерактивный режим (inquirer)', level: 'продвинутый' },
      { id: 4, title: 'Цвета, спиннеры, прогресс-бары', level: 'сложный' },
      { id: 5, title: 'Полноценное CLI-приложение', level: 'экспертный' },
    ],
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function toHtml(d) {
  const rows = d.tasks
    .map((t) => `    <tr><td>${t.id}</td><td>${escapeHtml(t.title)}</td><td>${escapeHtml(t.level)}</td></tr>`)
    .join('\n');
  return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>${escapeHtml(d.title)}</title></head>
<body>
  <h1>${escapeHtml(d.title)}</h1>
  <p>Группа: ${escapeHtml(d.group)}<br>Создан: ${escapeHtml(d.generatedAt)}</p>
  <table border="1" cellpadding="6">
    <tr><th>№</th><th>Задание</th><th>Уровень</th></tr>
${rows}
  </table>
</body>
</html>
`;
}

function toJson(d) {
  return JSON.stringify(d, null, 2) + '\n';
}

function csvCell(v) {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(d) {
  const lines = ['id,title,level', ...d.tasks.map((t) => [t.id, t.title, t.level].map(csvCell).join(','))];
  return lines.join('\n') + '\n';
}

/**
 * Минимальный корректный одностраничный PDF (шрифт Helvetica, только латиница —
 * кириллица потребовала бы встраивания шрифта).
 */
function toPdf(d) {
  const lines = ['Lab 17 report', 'Group: BBMO-01-23', `Generated: ${d.generatedAt}`, `Tasks: ${d.tasks.length}`];
  const text = lines.map((l, i) => `${i === 0 ? '' : 'T* '}(${l}) Tj`).join('\n');
  const stream = `BT /F1 16 Tf 72 760 Td 22 TL\n${text}\nET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefAt = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => {
    pdf += `${String(o).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

const renderers = { html: toHtml, json: toJson, csv: toCsv, pdf: toPdf };

function render(type) {
  return renderers[type](collectData());
}

module.exports = { REPORT_TYPES, render };
