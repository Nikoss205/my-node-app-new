

const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const router = new Router();

// Middleware для парсинга JSON-тела запросов
app.use(bodyParser());

// ============================================================
// ЗАДАНИЕ 3: Middleware логирования
// ============================================================
app.use(async (ctx, next) => {
  const start = Date.now();
  const ms = Date.now() - start;
  await next();
  const duration = Date.now() - start;
  const now = new Date().toLocaleString('ru-RU', { hour12: false });
  console.log(`[${now}] ${ctx.method} ${ctx.url} - ${duration}ms`);
});

// ============================================================
// ЗАДАНИЕ 3: Middleware обработки ошибок
// ============================================================
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = {
      error: err.message || 'Внутренняя ошибка сервера',
      status: ctx.status
    };
    ctx.app.emit('error', err, ctx);
  }
});

// ============================================================
// ЗАДАНИЕ 1: Корневой маршрут с HTML
// ============================================================
router.get('/', (ctx) => {
  const now = new Date().toLocaleString('ru-RU');
  ctx.type = 'html';
  ctx.body = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>Лабораторная работа №15</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; }
        h1 { color: #2c3e50; }
        .info { background: #ecf0f1; padding: 15px; border-radius: 8px; }
      </style>
    </head>
    <body>
      <h1>Лабораторная работа №15</h1>
      <div class="info">
        <p><strong>Группа:</strong> ББМО-01-23</p>
        <p><strong>Дата и время:</strong> ${now}</p>
        <p><strong>Приветствие:</strong> Добро пожаловать на сервер Koa.js!</p>
      </div>
    </body>
    </html>
  `;
});

// ============================================================
// ЗАДАНИЕ 2: REST API для пользователей
// ============================================================
let users = [
  { id: 1, name: 'Иванов Иван', group: 'ББМО-01-23' },
  { id: 2, name: 'Петров Пётр', group: 'ББМО-01-23' }
];
let nextUserId = 3;

// GET /api/users — список всех пользователей
router.get('/api/users', (ctx) => {
  ctx.body = users;
});

// POST /api/users — добавление пользователя
router.post('/api/users', (ctx) => {
  const { name, group } = ctx.request.body;
  if (!name || !group) {
    ctx.status = 400;
    ctx.body = { error: 'Поля name и group обязательны', status: 400 };
    return;
  }
  const newUser = { id: nextUserId++, name, group };
  users.push(newUser);
  ctx.status = 201;
  ctx.body = newUser;
});

// PUT /api/users/:id — обновление пользователя
router.put('/api/users/:id', (ctx) => {
  const id = parseInt(ctx.params.id);
  const user = users.find(u => u.id === id);
  if (!user) {
    ctx.status = 404;
    ctx.body = { error: 'Пользователь не найден', status: 404 };
    return;
  }
  const { name, group } = ctx.request.body;
  if (!name || !group) {
    ctx.status = 400;
    ctx.body = { error: 'Поля name и group обязательны', status: 400 };
    return;
  }
  user.name = name;
  user.group = group;
  ctx.body = user;
});

// DELETE /api/users/:id — удаление пользователя
router.delete('/api/users/:id', (ctx) => {
  const id = parseInt(ctx.params.id);
  const index = users.findIndex(u => u.id === id);
  if (index === -1) {
    ctx.status = 404;
    ctx.body = { error: 'Пользователь не найден', status: 404 };
    return;
  }
  users.splice(index, 1);
  ctx.body = { message: 'Пользователь успешно удалён' };
});

// ============================================================
// ЗАДАНИЕ 3: Middleware авторизации + тестовые маршруты
// ============================================================

// Middleware проверки авторизации
const authMiddleware = async (ctx, next) => {
  if (!ctx.headers.authorization) {
    ctx.status = 401;
    ctx.body = { error: 'Требуется авторизация', status: 401 };
    return;
  }
  await next();
};

// Защищённый маршрут
router.get('/protected', authMiddleware, (ctx) => {
  ctx.body = { message: 'Вы авторизованы! Это защищённый ресурс.' };
});

// Маршрут для тестирования обработки ошибок
router.get('/error', (ctx) => {
  throw new Error('Тестовая ошибка сервера');
});

// ============================================================
// ЗАДАНИЕ 5: Генерация 50 студентов на основе номера группы
// ============================================================
const GROUP_NUMBER = '402';

const firstNames = [
  'Александр', 'Анна', 'Иван', 'Мария', 'Дмитрий', 'Елена',
  'Сергей', 'Ольга', 'Андрей', 'Татьяна', 'Михаил', 'Наталья',
  'Алексей', 'Екатерина', 'Владимир', 'Юлия', 'Николай', 'Светлана',
  'Павел', 'Ирина', 'Виктор', 'Анастасия', 'Роман', 'Валерия', 'Максим'
];
const lastNames = [
  'Иванов', 'Петров', 'Сидоров', 'Смирнов', 'Кузнецов', 'Попов',
  'Васильев', 'Соколов', 'Михайлов', 'Новиков', 'Фёдоров', 'Морозов',
  'Волков', 'Алексеев', 'Лебедев', 'Семёнов', 'Егоров', 'Павлов',
  'Козлов', 'Степанов', 'Николаев', 'Орлов', 'Андреев', 'Макаров', 'Захаров'
];

function generateStudents(count, groupBase) {
  const students = [];
  // Извлекаем номер группы для вариаций (ББМО-01-23 → 01, 02, 03...)
  const match = groupBase.match(/-(\d+)-(\d+)$/);
  const groupNum = match ? parseInt(match[1]) : 1;
  const year = match ? match[2] : '23';
  const prefix = groupBase.replace(/-\d+-\d+$/, '');

  for (let i = 1; i <= count; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const groupVariant = String(groupNum + (i % 3)).padStart(2, '0');
    students.push({
      id: i,
      name: `${lastName} ${firstName}`,
      group: `${prefix}-${groupVariant}-${year}`,
      course: (i % 4) + 1
    });
  }
  return students;
}

let students = generateStudents(50, GROUP_NUMBER);
let nextStudentId = 51;

// ============================================================
// ЗАДАНИЯ 4 и 5: API для студентов (CRUD + пагинация + сортировка + поиск)
// ============================================================

// GET /students — список студентов с фильтрацией, пагинацией, сортировкой, поиском
router.get('/students', (ctx) => {
  let result = [...students];

  // Фильтрация по группе (query-параметр group)
  if (ctx.query.group) {
    result = result.filter(s => s.group === ctx.query.group);
  }

  // Поиск по имени (параметр search, регистронезависимый)
  if (ctx.query.search) {
    const search = ctx.query.search.toLowerCase();
    result = result.filter(s => s.name.toLowerCase().includes(search));
  }

  // Общее количество ДО пагинации
  const total = result.length;

  // Сортировка (параметр sort: name, -name, course)
  if (ctx.query.sort) {
    const sortField = ctx.query.sort;
    if (sortField.startsWith('-')) {
      const field = sortField.slice(1);
      result.sort((a, b) => (b[field] > a[field] ? 1 : -1));
    } else {
      result.sort((a, b) => (a[sortField] > b[sortField] ? 1 : -1));
    }
  }

  // Пагинация (limit и offset)
  const limit = parseInt(ctx.query.limit) || 10;
  const offset = parseInt(ctx.query.offset) || 0;
  result = result.slice(offset, offset + limit);

  ctx.body = {
    total,
    limit,
    offset,
    data: result
  };
});

// GET /students/:id — получение конкретного студента
router.get('/students/:id', (ctx) => {
  const id = parseInt(ctx.params.id);
  const student = students.find(s => s.id === id);
  if (!student) {
    ctx.status = 404;
    ctx.body = { error: 'Студент не найден', status: 404 };
    return;
  }
  ctx.body = student;
});

// POST /students — добавление студента
router.post('/students', (ctx) => {
  const { name, group, course } = ctx.request.body;
  if (!name || !group || !course) {
    ctx.status = 400;
    ctx.body = { error: 'Поля name, group и course обязательны', status: 400 };
    return;
  }
  if (course < 1 || course > 4) {
    ctx.status = 400;
    ctx.body = { error: 'Курс должен быть от 1 до 4', status: 400 };
    return;
  }
  const newStudent = { id: nextStudentId++, name, group, course };
  students.push(newStudent);
  ctx.status = 201;
  ctx.body = newStudent;
});

// PUT /students/:id — обновление студента
router.put('/students/:id', (ctx) => {
  const id = parseInt(ctx.params.id);
  const student = students.find(s => s.id === id);
  if (!student) {
    ctx.status = 404;
    ctx.body = { error: 'Студент не найден', status: 404 };
    return;
  }
  const { name, group, course } = ctx.request.body;
  if (name) student.name = name;
  if (group) student.group = group;
  if (course) {
    if (course < 1 || course > 4) {
      ctx.status = 400;
      ctx.body = { error: 'Курс должен быть от 1 до 4', status: 400 };
      return;
    }
    student.course = course;
  }
  ctx.body = student;
});

// DELETE /students/:id — удаление студента
router.delete('/students/:id', (ctx) => {
  const id = parseInt(ctx.params.id);
  const index = students.findIndex(s => s.id === id);
  if (index === -1) {
    ctx.status = 404;
    ctx.body = { error: 'Студент не найден', status: 404 };
    return;
  }
  students.splice(index, 1);
  ctx.body = { message: 'Студент успешно удалён' };
});

// ============================================================
// Подключаем маршруты и запускаем сервер
// ============================================================
app.use(router.routes()).use(router.allowedMethods());

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
  console.log(`📚 Сгенерировано студентов: ${students.length}`);
});