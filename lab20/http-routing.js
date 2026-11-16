
const http = require('http');

const PORT = 3000;

let students = [
  { id: 1, name: 'Шикель Никита', group: 'ББМО-01-23' },
  { id: 2, name: 'Алексей Смирнов', group: 'ББМО-02-23' }
];
let nextId = 3;

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString('utf8');
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const routes = [
  {
    method: 'GET',
    pattern: /^\/users\/([^\/]+)$/,
    handler: (req, res, params) => {
      sendJson(res, 200, { id: params[0] });
    }
  },
  {
    method: 'GET',
    pattern: /^\/users\/([^\/]+)\/posts\/([^\/]+)$/,
    handler: (req, res, params) => {
      sendJson(res, 200, { userId: params[0], postId: params[1] });
    }
  },
  {
    method: 'GET',
    pattern: /^\/search$/,
    handler: (req, res, params, query) => {
      const q = query.q || '';
      const limit = parseInt(query.limit, 10) || 10;
      sendJson(res, 200, { q: q, limit: limit });
    }
  },
  {
    method: 'GET',
    pattern: /^\/api\/students$/,
    handler: (req, res, params, query) => {
      let result = students;
      if (query.group) {
        result = students.filter((s) => s.group === query.group);
      }
      sendJson(res, 200, result);
    }
  },
  {
    method: 'GET',
    pattern: /^\/api\/students\/(\d+)$/,
    handler: (req, res, params) => {
      const id = parseInt(params[0], 10);
      const student = students.find((s) => s.id === id);
      if (!student) return sendText(res, 404, 'Not Found');
      sendJson(res, 200, student);
    }
  },
  {
    method: 'POST',
    pattern: /^\/api\/students$/,
    handler: async (req, res) => {
      try {
        const data = await readJsonBody(req);
        const newStudent = {
          id: nextId++,
          name: data.name || 'Без имени',
          group: data.group || 'ББМО-01-23'
        };
        students.push(newStudent);
        sendJson(res, 201, newStudent);
      } catch (e) {
        sendText(res, 400, e.message);
      }
    }
  },
  {
    method: 'PUT',
    pattern: /^\/api\/students\/(\d+)$/,
    handler: async (req, res, params) => {
      try {
        const id = parseInt(params[0], 10);
        const student = students.find((s) => s.id === id);
        if (!student) return sendText(res, 404, 'Not Found');
        const data = await readJsonBody(req);
        if (data.name) student.name = data.name;
        if (data.group) student.group = data.group;
        sendJson(res, 200, student);
      } catch (e) {
        sendText(res, 400, e.message);
      }
    }
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/students\/(\d+)$/,
    handler: (req, res, params) => {
      const id = parseInt(params[0], 10);
      const index = students.findIndex((s) => s.id === id);
      if (index === -1) return sendText(res, 404, 'Not Found');
      students.splice(index, 1);
      sendJson(res, 200, { deleted: true, id: id });
    }
  }
];

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, 'http://localhost:' + PORT);
  const pathname = decodeURIComponent(parsedUrl.pathname);
  const query = Object.fromEntries(parsedUrl.searchParams.entries());

  res.on('finish', () => {
    const timestamp = new Date().toISOString();
    console.log('[' + timestamp + '] [ББМО-01-23] ' + req.method + ' ' + pathname + ' ' + res.statusCode);
  });

  const matchingPathRoutes = routes.filter((r) => r.pattern.test(pathname));

  if (matchingPathRoutes.length === 0) {
    return sendText(res, 404, 'Not Found');
  }
const route = matchingPathRoutes.find((r) => r.method === req.method);

  if (!route) {
    return sendText(res, 405, '405 Method Not Allowed');
  }

  const match = pathname.match(route.pattern);
  const params = match ? match.slice(1) : [];

  await route.handler(req, res, params, query);
});

server.listen(PORT, () => {
  console.log('Сервер запущен на порту ' + PORT);
});