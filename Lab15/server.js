/**
 * Лабораторная работа №15
 * Исследование методов создания простого сервера с использованием Koa.js
 * Группа: ББМО-01-23
 *
 * Реализованы задания 1–5:
 *   1. Базовая HTML-страница на "/"
 *   2. REST API для пользователей "/api/users" (CRUD)
 *   3. Middleware: логирование, обработка ошибок, авторизация, "/protected", "/error"
 *   4. API для студентов "/students" с фильтрацией по группе и CRUD
 *   5. Генерация 50 студентов, пагинация, сортировка, поиск
 */

const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const router = new Router();

const GROUP = 'ББМО-01-23';
const PORT = 3000;

/* =========================================================================
 * ЗАДАНИЕ 2: In-memory хранилище пользователей
 * ========================================================================= */
let users = [
  { id: 1, name: 'Иванов Иван', group: GROUP },
  { id: 2, name: 'Смирнова Анна', group: GROUP },
];
let nextUserId = 3;

/* =========================================================================
 * ЗАДАНИЕ 5: Генерация 50 студентов на основе номера группы ББМО-01-23
 * ========================================================================= */
const firstNamesM = ['Иван', 'Петр', 'Алексей', 'Дмитрий', 'Сергей', 'Андрей', 'Николай', 'Максим', 'Егор', 'Кирилл'];
const firstNamesF = ['Анна', 'Мария', 'Елена', 'Ольга', 'Татьяна', 'Светлана', 'Дарья', 'Ирина', 'Наталья', 'Полина'];
const lastNamesM = ['Иванов', 'Петров', 'Сидоров', 'Смирнов', 'Кузнецов', 'Попов', 'Соколов', 'Лебедев', 'Козлов', 'Новиков'];
const lastNamesF = ['Иванова', 'Петрова', 'Сидорова', 'Смирнова', 'Кузнецова', 'Попова', 'Соколова', 'Лебедева', 'Козлова', 'Новикова'];

// Разбираем номер группы вида "ББМО-01-23" -> подгруппа 01, год поступления 23
function parseGroupNumber(group) {
  const match = /(\d{2})-(\d{2})$/.exec(group);
  if (!match) return { subgroup: 1, admissionYear: 2023 };
  return { subgroup: parseInt(match[1], 10), admissionYear: 2000 + parseInt(match[2], 10) };
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Распределяем студентов по нескольким подгруппам, вычисленным из номера группы
function buildGroupPool(baseGroup, count) {
  const { subgroup } = parseGroupNumber(baseGroup);
  const pools = [];
  for (let i = 0; i < 3; i += 1) {
    const n = String(subgroup + i).padStart(2, '0');
    pools.push(`ББМО-${n}-23`);
  }
  return pools;
}

function generateStudents(baseGroup, count) {
  const groupPool = buildGroupPool(baseGroup, count);
  const generated = [];
  for (let i = 1; i <= count; i += 1) {
    const isMale = Math.random() > 0.5;
    const first = isMale ? randomFrom(firstNamesM) : randomFrom(firstNamesF);
    const last = isMale ? randomFrom(lastNamesM) : randomFrom(lastNamesF);
    generated.push({
      id: i,
      name: `${last} ${first}`,
      group: randomFrom(groupPool),
      course: Math.floor(Math.random() * 4) + 1,
    });
  }
  return generated;
}

let students = generateStudents(GROUP, 50);
let nextStudentId = students.length + 1;

/* =========================================================================
 * ЗАДАНИЕ 3: Middleware логирования
 * ========================================================================= */
function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

app.use(async (ctx, next) => {
  const startTime = Date.now();
  const startDate = new Date(startTime);
  await next();
  const ms = Date.now() - startTime;
  console.log(`[${formatTimestamp(startDate)}] ${ctx.method} ${ctx.path} - ${ms}ms`);
});

/* =========================================================================
 * ЗАДАНИЕ 3: Middleware обработки ошибок
 * ========================================================================= */
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || err.statusCode || 500;
    ctx.body = {
      error: err.expose ? err.message : (err.message || 'Внутренняя ошибка сервера'),
      status: ctx.status,
    };
  }
});

app.use(bodyParser());

/* =========================================================================
 * ЗАДАНИЕ 3: Middleware авторизации (для защищённых маршрутов)
 * ========================================================================= */
async function requireAuth(ctx, next) {
  const authHeader = ctx.headers['authorization'];
  if (!authHeader) {
    ctx.throw(401, 'Требуется авторизация: отсутствует заголовок Authorization');
  }
  await next();
}

/* =========================================================================
 * ЗАДАНИЕ 1: Главная HTML-страница
 * ========================================================================= */
router.get('/', async (ctx) => {
  const now = new Date().toLocaleString('ru-RU');
  ctx.type = 'html';
  ctx.body = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Лабораторная работа №15</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f6f8; margin: 0; padding: 40px; }
    .card { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 10px;
            padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
    h1 { color: #2c3e50; margin-top: 0; }
    .group { display: inline-block; background: #eaf3ff; color: #1a73e8;
             padding: 4px 12px; border-radius: 20px; font-weight: bold; }
    .time { color: #666; margin-top: 16px; }
    .welcome { margin-top: 20px; font-size: 1.05em; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Лабораторная работа №15</h1>
    <p>Исследование методов создания простого сервера с использованием Koa.js</p>
    <p>Группа: <span class="group">${GROUP}</span></p>
    <p class="time">Текущая дата и время: ${now}</p>
    <p class="welcome">Добро пожаловать! Сервер на Koa.js успешно запущен и обрабатывает запросы.</p>
  </div>
</body>
</html>`;
});

/* =========================================================================
 * ЗАДАНИЕ 2: REST API для пользователей
 * ========================================================================= */
router.get('/api/users', async (ctx) => {
  ctx.body = users;
});

router.post('/api/users', async (ctx) => {
  const { name, group } = ctx.request.body || {};
  if (!name || !group) {
    ctx.throw(400, 'Поля "name" и "group" обязательны');
  }
  const newUser = { id: nextUserId, name, group };
  nextUserId += 1;
  users.push(newUser);
  ctx.status = 201;
  ctx.body = newUser;
});

router.put('/api/users/:id', async (ctx) => {
  const id = parseInt(ctx.params.id, 10);
  const user = users.find((u) => u.id === id);
  if (!user) {
    ctx.throw(404, `Пользователь с id=${id} не найден`);
  }
  const { name, group } = ctx.request.body || {};
  if (!name && !group) {
    ctx.throw(400, 'Нужно передать хотя бы одно поле: "name" или "group"');
  }
  if (name) user.name = name;
  if (group) user.group = group;
  ctx.body = user;
});

router.delete('/api/users/:id', async (ctx) => {
  const id = parseInt(ctx.params.id, 10);
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) {
    ctx.throw(404, `Пользователь с id=${id} не найден`);
  }
  users.splice(index, 1);
  ctx.body = { message: `Пользователь с id=${id} успешно удалён` };
});

/* =========================================================================
 * ЗАДАНИЕ 3: Тестовые маршруты для авторизации и ошибок
 * ========================================================================= */
router.get('/protected', requireAuth, async (ctx) => {
  ctx.body = { message: 'Доступ разрешён: вы успешно прошли авторизацию' };
});

router.get('/error', async () => {
  throw new Error('Тестовая ошибка для проверки middleware обработки ошибок');
});

/* =========================================================================
 * ЗАДАНИЕ 4 и 5: API для студентов (фильтр, пагинация, сортировка, поиск)
 * ========================================================================= */
router.get('/students', async (ctx) => {
  let result = [...students];
  const { group, search, sort, limit, offset } = ctx.query;

  if (group) {
    result = result.filter((s) => s.group === group);
  }

  if (search) {
    const term = String(search).toLowerCase();
    result = result.filter((s) => s.name.toLowerCase().includes(term));
  }

  if (sort) {
    const desc = String(sort).startsWith('-');
    const field = desc ? String(sort).slice(1) : String(sort);
    result.sort((a, b) => {
      if (a[field] < b[field]) return desc ? 1 : -1;
      if (a[field] > b[field]) return desc ? -1 : 1;
      return 0;
    });
  }

  const total = result.length;
  const limitNum = limit ? parseInt(limit, 10) : 10;
  const offsetNum = offset ? parseInt(offset, 10) : 0;
  const page = result.slice(offsetNum, offsetNum + limitNum);

  ctx.body = { total, limit: limitNum, offset: offsetNum, data: page };
});

router.get('/students/:id', async (ctx) => {
  const id = parseInt(ctx.params.id, 10);
  const student = students.find((s) => s.id === id);
  if (!student) {
    ctx.throw(404, `Студент с id=${id} не найден`);
  }
  ctx.body = student;
});

router.post('/students', async (ctx) => {
  const { name, group, course } = ctx.request.body || {};
  if (!name || !group || !course) {
    ctx.throw(400, 'Поля "name", "group" и "course" обязательны');
  }
  const newStudent = { id: nextStudentId, name, group, course };
  nextStudentId += 1;
  students.push(newStudent);
  ctx.status = 201;
  ctx.body = newStudent;
});

router.put('/students/:id', async (ctx) => {
  const id = parseInt(ctx.params.id, 10);
  const student = students.find((s) => s.id === id);
  if (!student) {
    ctx.throw(404, `Студент с id=${id} не найден`);
  }
  const { name, group, course } = ctx.request.body || {};
  if (!name && !group && !course) {
    ctx.throw(400, 'Нужно передать хотя бы одно поле для обновления');
  }
  if (name) student.name = name;
  if (group) student.group = group;
  if (course) student.course = course;
  ctx.body = student;
});

router.delete('/students/:id', async (ctx) => {
  const id = parseInt(ctx.params.id, 10);
  const index = students.findIndex((s) => s.id === id);
  if (index === -1) {
    ctx.throw(404, `Студент с id=${id} не найден`);
  }
  students.splice(index, 1);
  ctx.body = { message: `Студент с id=${id} успешно удалён` };
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
  console.log(`Сгенерировано студентов: ${students.length}`);
});
