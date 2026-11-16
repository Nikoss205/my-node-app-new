const http = require('node:http');

const PORT = Number(process.env.PORT || 3003);
let nextId = 3;
const students = [
  { id: 1, name: 'Іван Петренко', group: 'ББМО-01-23' },
  { id: 2, name: 'Олена Коваль', group: 'ББМО-01-23' }
];

function sendJson(res, status, data, extraHeaders = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders });
  res.end(JSON.stringify(data, null, 2));
}
function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (!url.pathname.startsWith('/api/students')) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404 Not Found');
  }

  const match = url.pathname.match(/^\/api\/students(?:\/(\d+))?\/?$/);
  if (!match) return sendJson(res, 404, { error: 'Route not found' });
  const id = match[1] ? Number(match[1]) : null;

  if (req.method === 'GET') {
    if (id !== null) {
      const student = students.find(item => item.id === id);
      return student ? sendJson(res, 200, student) : sendJson(res, 404, { error: 'Student not found' });
    }
    const group = url.searchParams.get('group');
    const result = group ? students.filter(item => item.group === group) : students;
    return sendJson(res, 200, result);
  }

  if (req.method === 'POST' && id === null) {
    let payload;
    try { payload = JSON.parse(await getBody(req) || '{}'); }
    catch { return sendJson(res, 400, { error: 'Invalid JSON' }); }
    if (!payload.name || !payload.group) return sendJson(res, 400, { error: 'name and group are required' });
    const student = { id: nextId++, name: String(payload.name), group: String(payload.group) };
    students.push(student);
    return sendJson(res, 201, student, { Location: `/api/students/${student.id}` });
  }

  if (req.method === 'PUT' && id !== null) {
    const index = students.findIndex(item => item.id === id);
    if (index < 0) return sendJson(res, 404, { error: 'Student not found' });
    let payload;
    try { payload = JSON.parse(await getBody(req) || '{}'); }
    catch { return sendJson(res, 400, { error: 'Invalid JSON' }); }
    students[index] = {
      id,
      name: payload.name === undefined ? students[index].name : String(payload.name),
      group: payload.group === undefined ? students[index].group : String(payload.group)
    };
    return sendJson(res, 200, students[index]);
  }

  if (req.method === 'DELETE' && id !== null) {
    const index = students.findIndex(item => item.id === id);
    if (index < 0) return sendJson(res, 404, { error: 'Student not found' });
    const [removed] = students.splice(index, 1);
    return sendJson(res, 200, { deleted: removed });
  }

  const allowed = id === null ? 'GET, POST' : 'GET, PUT, DELETE';
  return sendJson(res, 405, { error: 'Method not allowed' }, { Allow: allowed });
});

server.listen(PORT, () => console.log(`Task 4: http://localhost:${PORT}`));
