/**
 * Лабораторная работа №16
 * Исследование методов создания простого сервера с использованием Express.js
 * Группа: ББМО-01-23
 * Разработчик: Шикель Никита
 *
 * Задания:
 *   Task 1 — базовый HTML-сервер ("/", "/about", "/contacts")
 *   Task 2 — REST API для книг "/api/books" (CRUD + поиск по автору)
 *   Task 3 — middleware: логирование, сжатие, rate limit, обработка ошибок
 *   Task 4 — фильтрация, пагинация, сортировка, статистика, валидация
 *   Task 5 — генерация 100 книг, JWT-аутентификация, роли, Swagger, кэш
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const PORT = 3000;
const GROUP = 'ББМО-01-23';
const DEVELOPER = 'Шикель Никита';
const JWT_SECRET = 'lab16-bbmo-01-23-secret-key'; // учебный проект — для реального продакшена вынести в .env
const LOG_FILE = path.join(__dirname, 'logs.txt');

app.use(express.json());

/* =========================================================================
 * TASK 3: Middleware сжатия (gzip/deflate по заголовку Accept-Encoding)
 * ========================================================================= */
app.use(compression());

/* =========================================================================
 * TASK 3: Middleware ограничения скорости запросов — не более 100 в минуту
 * ========================================================================= */
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true, // добавляет заголовки RateLimit-*
  legacyHeaders: false,
  message: { error: 'Слишком много запросов, попробуйте позже', status: 429 },
});
app.use(limiter);

/* =========================================================================
 * TASK 3 / TASK 4: Middleware логирования (консоль + файл)
 * ========================================================================= */
function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const line = `[${formatTimestamp(new Date())}] ${req.method} ${req.path} ${res.statusCode} - ${ms}ms`;
    console.log(line);
    fs.appendFile(LOG_FILE, `${line}\n`, () => {});
  });
  next();
});

// Оборачиваем асинхронные обработчики, чтобы ошибки попадали в error-middleware
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/* =========================================================================
 * TASK 5: Генерация 100 книг на основе номера группы ББМО-01-23
 * ========================================================================= */
const titleAdjectives = ['Тайна', 'Эхо', 'Тень', 'Свет', 'Легенда', 'Голос', 'Память', 'Обратная сторона', 'Последний', 'Забытый'];
const titleNouns = ['леса', 'моря', 'звёзд', 'времени', 'города', 'ветра', 'снов', 'равнины', 'реки', 'огня'];
const authorFirstNames = ['Иван', 'Анна', 'Сергей', 'Елена', 'Дмитрий', 'Мария', 'Алексей', 'Ольга'];
const authorLastNames = ['Громов', 'Соколова', 'Белов', 'Орлова', 'Волков', 'Зайцева', 'Морозов', 'Лебедева'];
const genres = ['роман', 'детектив', 'фантастика', 'поэзия', 'драма', 'приключения', 'биография', 'история'];

function parseGroupNumber(group) {
  const match = /(\d{2})-(\d{2})$/.exec(group);
  if (!match) return { subgroup: 1, admissionYear: 2023 };
  return { subgroup: parseInt(match[1], 10), admissionYear: 2000 + parseInt(match[2], 10) };
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateIsbn(subgroup) {
  const part = () => String(Math.floor(Math.random() * 90000) + 10000);
  return `978-5-${String(subgroup).padStart(2, '0')}-${part()}-${Math.floor(Math.random() * 10)}`;
}

function generateBooks(baseGroup, count) {
  const { subgroup } = parseGroupNumber(baseGroup);
  const list = [];
  for (let i = 1; i <= count; i += 1) {
    const title = `${randomFrom(titleAdjectives)} ${randomFrom(titleNouns)}`;
    const author = `${randomFrom(authorLastNames)} ${randomFrom(authorFirstNames)[0]}.`;
    const year = 1950 + Math.floor(Math.random() * 76); // 1950–2025
    list.push({
      id: i,
      title,
      author,
      year,
      genre: randomFrom(genres),
      isbn: generateIsbn(subgroup),
      available: Math.random() > 0.3,
      reviews: [],
    });
  }
  return list;
}

let books = generateBooks(GROUP, 100);
let nextBookId = books.length + 1;
const booksCache = new Map(); // простой in-memory кэш для GET /api/books, TTL 5 минут
const CACHE_TTL_MS = 5 * 60 * 1000;

function clearBooksCache() {
  booksCache.clear();
}

/* =========================================================================
 * TASK 5: Пользователи и JWT-аутентификация
 * ========================================================================= */
let users = [
  {
    id: 1,
    email: 'admin@lab16.local',
    name: 'Администратор',
    passwordHash: bcrypt.hashSync('admin123', 8),
    role: 'admin',
  },
];
let nextUserId = 2;

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация: заголовок Authorization отсутствует или некорректен', status: 401 });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ error: 'Невалидный или просроченный токен', status: 403 });
    }
    req.user = payload;
    return next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ только для администраторов', status: 403 });
  }
  return next();
}

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     responses:
 *       201:
 *         description: Пользователь успешно зарегистрирован
 */
app.post('/auth/register', (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Поля "email", "password" и "name" обязательны', status: 400 });
  }
  if (users.find((u) => u.email === email)) {
    return res.status(400).json({ error: 'Пользователь с таким email уже зарегистрирован', status: 400 });
  }
  const newUser = {
    id: nextUserId,
    email,
    name,
    passwordHash: bcrypt.hashSync(password, 8),
    role: 'user',
  };
  nextUserId += 1;
  users.push(newUser);
  return res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Вход в систему, получение JWT-токена
 *     responses:
 *       200:
 *         description: Токен выдан
 */
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Поля "email" и "password" обязательны', status: 400 });
  }
  const user = users.find((u) => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Неверный email или пароль', status: 401 });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
  return res.json({ token });
});

/* =========================================================================
 * TASK 1: HTML-страницы
 * ========================================================================= */
function pageLayout(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f6f8; margin: 0; padding: 40px; }
    .card { max-width: 640px; margin: 0 auto; background: #fff; border-radius: 10px;
            padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
    h1 { color: #2c3e50; margin-top: 0; }
    h2 { color: #34495e; margin-top: 24px; font-size: 1.1em; }
    .group { display: inline-block; background: #eaf3ff; color: #1a73e8;
             padding: 4px 12px; border-radius: 20px; font-weight: bold; }
    .time { color: #666; margin-top: 16px; }
    a { color: #1a73e8; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; }
    ul { padding-left: 20px; }
  </style>
</head>
<body>
  <div class="card">${bodyHtml}</div>
</body>
</html>`;
}

app.get('/', (req, res) => {
  const now = new Date().toLocaleString('ru-RU');
  const body = `
    <h1>Лабораторная работа №16</h1>
    <p>Исследование методов создания простого сервера с использованием Express.js</p>
    <p>Группа: <span class="group">${GROUP}</span></p>
    <p class="time">Текущая дата и время: ${now}</p>
    <p>Добро пожаловать! Сервер на Express.js успешно запущен.</p>

    <h2>Task 1 — базовые страницы</h2>
    <ul>
      <li><a href="/">/</a> — главная страница</li>
      <li><a href="/about">/about</a> — информация о разработчике</li>
      <li><a href="/contacts">/contacts</a> — контакты</li>
    </ul>

    <h2>Task 2 — REST API книг</h2>
    <ul>
      <li>GET <code>/api/books</code>, GET <code>/api/books/:id</code></li>
      <li>POST / PUT / DELETE <code>/api/books</code></li>
      <li>GET <code>/api/books/search?author=...</code></li>
    </ul>

    <h2>Task 3 — middleware</h2>
    <ul>
      <li>GET <code>/error</code>, <code>/async-error</code> — проверка обработчика ошибок</li>
    </ul>

    <h2>Task 4 — фильтры, пагинация, сортировка, статистика</h2>
    <ul>
      <li>GET <code>/api/books?author=&year=&yearFrom=&yearTo=&limit=&page=&sort=&search=</code></li>
      <li>GET <code>/api/books/stats</code></li>
    </ul>

    <h2>Task 5 — аутентификация, Swagger, кэш</h2>
    <ul>
      <li>POST <code>/auth/register</code>, POST <code>/auth/login</code></li>
      <li>GET <code>/api/books/export</code>, POST <code>/api/books/import</code></li>
      <li>GET <code>/api/books/recommendations</code>, GET <code>/api/books/available</code></li>
      <li>POST <code>/api/books/:id/reviews</code></li>
      <li>GET <code>/api/admin/dashboard</code> (только для администратора)</li>
      <li>Документация API: <a href="/api-docs">/api-docs</a></li>
    </ul>
  `;
  res.type('html').send(pageLayout('Лабораторная работа №16', body));
});

app.get('/about', (req, res) => {
  const body = `
    <h1>О разработчике</h1>
    <p><strong>Имя:</strong> ${DEVELOPER}</p>
    <p><strong>Группа:</strong> ${GROUP}</p>
    <p>Эта страница создана в рамках выполнения Task 1 лабораторной работы №16
       по дисциплине, посвящённой серверной разработке на Express.js.</p>
    <p><a href="/">← на главную</a></p>
  `;
  res.type('html').send(pageLayout('О разработчике', body));
});

app.get('/contacts', (req, res) => {
  const body = `
    <h1>Контакты</h1>
    <ul>
      <li>Email: nikita.shikel@example.com</li>
      <li>GitHub: github.com/Nikoss205</li>
      <li>Группа: ${GROUP}</li>
    </ul>
    <p><a href="/">← на главную</a></p>
  `;
  res.type('html').send(pageLayout('Контакты', body));
});

/* =========================================================================
 * TASK 5: Защита всех /api/books маршрутов JWT
 * ========================================================================= */
app.use('/api/books', authenticateToken);

/* =========================================================================
 * TASK 4 / TASK 5: Вспомогательные "особые" GET-маршруты книг
 * (должны идти РАНЬШЕ "/api/books/:id", иначе express примет их за id)
 * ========================================================================= */

/**
 * @openapi
 * /api/books/stats:
 *   get:
 *     summary: Статистика по книгам
 */
app.get('/api/books/stats', (req, res) => {
  const total = books.length;
  const byAuthor = {};
  const byGenre = {};
  let oldest = null;
  let newest = null;
  books.forEach((b) => {
    byAuthor[b.author] = (byAuthor[b.author] || 0) + 1;
    byGenre[b.genre] = (byGenre[b.genre] || 0) + 1;
    if (oldest === null || b.year < oldest) oldest = b.year;
    if (newest === null || b.year > newest) newest = b.year;
  });
  res.json({ total, byAuthor, byGenre, oldestYear: oldest, newestYear: newest });
});

app.get('/api/books/search', (req, res) => {
  const { author } = req.query;
  if (!author) {
    return res.status(400).json({ error: 'Параметр "author" обязателен', status: 400 });
  }
  const result = books.filter((b) => b.author.toLowerCase().includes(String(author).toLowerCase()));
  return res.json(result);
});

app.get('/api/books/available', (req, res) => {
  res.json(books.filter((b) => b.available));
});

app.get('/api/books/recommendations', (req, res) => {
  const genre = req.query.genre || randomFrom(genres);
  const result = books.filter((b) => b.genre === genre).slice(0, 10);
  res.json({ genre, recommendations: result });
});

app.get('/api/books/export', (req, res) => {
  const format = (req.query.format || 'json').toLowerCase();
  if (format === 'csv') {
    const header = 'id,title,author,year,genre,isbn,available\n';
    const rows = books.map((b) => `${b.id},"${b.title}","${b.author}",${b.year},${b.genre},${b.isbn},${b.available}`).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="books.csv"');
    return res.send(header + rows);
  }
  return res.json(books);
});

app.post('/api/books/import', express.text({ type: '*/*' }), (req, res) => {
  const csv = req.body;
  if (!csv || typeof csv !== 'string') {
    return res.status(400).json({ error: 'Тело запроса должно содержать CSV-текст', status: 400 });
  }
  const lines = csv.trim().split('\n');
  const dataLines = lines[0].toLowerCase().startsWith('title') ? lines.slice(1) : lines;
  let imported = 0;
  dataLines.forEach((line) => {
    const [title, author, year, genre] = line.split(',').map((s) => (s || '').trim());
    if (title && author) {
      books.push({
        id: nextBookId,
        title,
        author,
        year: parseInt(year, 10) || new Date().getFullYear(),
        genre: genre || 'без жанра',
        isbn: generateIsbn(parseGroupNumber(GROUP).subgroup),
        available: true,
        reviews: [],
      });
      nextBookId += 1;
      imported += 1;
    }
  });
  clearBooksCache();
  return res.status(201).json({ message: `Импортировано книг: ${imported}` });
});

/* =========================================================================
 * TASK 2 / TASK 4: Основной список книг — фильтр, пагинация, сортировка, поиск
 * ========================================================================= */

/**
 * @openapi
 * /api/books:
 *   get:
 *     summary: Список книг с фильтрацией, пагинацией, сортировкой и поиском
 *   post:
 *     summary: Добавление новой книги (только администратор)
 */
app.get('/api/books', (req, res) => {
  const cacheKey = req.originalUrl;
  const cached = booksCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached.data);
  }

  let result = [...books];
  const {
    author, year, yearFrom, yearTo, sort, search, limit, page,
  } = req.query;

  if (author) result = result.filter((b) => b.author.toLowerCase().includes(String(author).toLowerCase()));
  if (year) result = result.filter((b) => b.year === parseInt(year, 10));
  if (yearFrom) result = result.filter((b) => b.year >= parseInt(yearFrom, 10));
  if (yearTo) result = result.filter((b) => b.year <= parseInt(yearTo, 10));
  if (search) {
    const term = String(search).toLowerCase();
    result = result.filter((b) => b.title.toLowerCase().includes(term) || b.author.toLowerCase().includes(term));
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
  const pageNum = page ? parseInt(page, 10) : 1;
  const start = (pageNum - 1) * limitNum;
  const paged = result.slice(start, start + limitNum);

  const responseBody = {
    total, page: pageNum, limit: limitNum, data: paged,
  };
  booksCache.set(cacheKey, { data: responseBody, expiresAt: Date.now() + CACHE_TTL_MS });
  res.setHeader('X-Cache', 'MISS');
  return res.json(responseBody);
});

function validateBookInput(body, { partial } = { partial: false }) {
  const errors = [];
  if (!partial || body.title !== undefined) {
    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
      errors.push('Поле "title" обязательно и не должно быть пустым');
    }
  }
  if (!partial || body.year !== undefined) {
    const yearNum = parseInt(body.year, 10);
    if (!body.year || Number.isNaN(yearNum) || yearNum < 1000 || yearNum > new Date().getFullYear() + 1) {
      errors.push('Поле "year" должно быть корректным годом издания');
    }
  }
  return errors;
}

// Task 5: добавлять книги может только администратор
app.post('/api/books', requireAdmin, (req, res) => {
  const { title, author, year, genre } = req.body || {};
  const errors = validateBookInput(req.body || {});
  if (!author) errors.push('Поле "author" обязательно');
  if (errors.length) {
    return res.status(400).json({ error: errors.join('; '), status: 400 });
  }
  const duplicate = books.find(
    (b) => b.title.toLowerCase() === title.toLowerCase() && b.author.toLowerCase() === author.toLowerCase(),
  );
  if (duplicate) {
    return res.status(400).json({ error: 'Книга с таким названием и автором уже существует', status: 400 });
  }
  const newBook = {
    id: nextBookId,
    title,
    author,
    year: parseInt(year, 10),
    genre: genre || 'не указан',
    isbn: generateIsbn(parseGroupNumber(GROUP).subgroup),
    available: true,
    reviews: [],
  };
  nextBookId += 1;
  books.push(newBook);
  clearBooksCache();
  return res.status(201).json(newBook);
});

app.get('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const book = books.find((b) => b.id === id);
  if (!book) {
    return res.status(404).json({ error: `Книга с id=${id} не найдена`, status: 404 });
  }
  return res.json(book);
});

app.put('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const book = books.find((b) => b.id === id);
  if (!book) {
    return res.status(404).json({ error: `Книга с id=${id} не найдена`, status: 404 });
  }
  const errors = validateBookInput(req.body || {}, { partial: true });
  if (errors.length) {
    return res.status(400).json({ error: errors.join('; '), status: 400 });
  }
  const { title, author, year, genre, available } = req.body || {};
  if (title) book.title = title;
  if (author) book.author = author;
  if (year) book.year = parseInt(year, 10);
  if (genre) book.genre = genre;
  if (typeof available === 'boolean') book.available = available;
  clearBooksCache();
  return res.json(book);
});

// Task 5: удалять книги может только администратор
app.delete('/api/books/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = books.findIndex((b) => b.id === id);
  if (index === -1) {
    return res.status(404).json({ error: `Книга с id=${id} не найдена`, status: 404 });
  }
  books.splice(index, 1);
  clearBooksCache();
  return res.json({ message: `Книга с id=${id} успешно удалена` });
});

app.post('/api/books/:id/reviews', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const book = books.find((b) => b.id === id);
  if (!book) {
    return res.status(404).json({ error: `Книга с id=${id} не найдена`, status: 404 });
  }
  const { text, rating } = req.body || {};
  if (!text) {
    return res.status(400).json({ error: 'Поле "text" обязательно', status: 400 });
  }
  const review = {
    author: req.user.email,
    text,
    rating: rating || null,
    date: new Date().toISOString(),
  };
  book.reviews.push(review);
  return res.status(201).json(review);
});

/* =========================================================================
 * TASK 5: Админский раздел
 * ========================================================================= */
app.get('/api/admin/dashboard', authenticateToken, requireAdmin, (req, res) => {
  res.json({
    totalUsers: users.length,
    totalBooks: books.length,
    admins: users.filter((u) => u.role === 'admin').length,
  });
});

/* =========================================================================
 * TASK 5: Документация Swagger
 * ========================================================================= */
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lab16 Library API',
      version: '1.0.0',
      description: 'Документация REST API лабораторной работы №16 (Express.js)',
    },
    servers: [{ url: `http://localhost:${PORT}` }],
  },
  apis: [__filename],
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* =========================================================================
 * TASK 3: Тестовые маршруты для проверки обработчика ошибок
 * ========================================================================= */
app.get('/error', () => {
  throw new Error('Тестовая синхронная ошибка для проверки middleware обработки ошибок');
});

app.get('/async-error', asyncHandler(async () => {
  await new Promise((resolve) => { setTimeout(resolve, 10); });
  throw new Error('Тестовая асинхронная ошибка для проверки middleware обработки ошибок');
}));

/* =========================================================================
 * 404 — маршрут не найден
 * ========================================================================= */
app.use((req, res) => {
  res.status(404).json({ error: `Маршрут ${req.method} ${req.path} не найден`, status: 404 });
});

/* =========================================================================
 * TASK 3: Централизованный обработчик ошибок (должен быть последним)
 * ========================================================================= */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(`[${formatTimestamp(new Date())}] ОШИБКА: ${err.message}`);
  res.status(status).json({ error: err.message || 'Внутренняя ошибка сервера', status });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
  console.log(`Документация API: http://localhost:${PORT}/api-docs`);
  console.log(`Сгенерировано книг: ${books.length}`);
  console.log(`Администратор по умолчанию: admin@lab16.local / admin123`);
});
