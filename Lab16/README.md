# Лабораторная работа №16 — Express.js

Сервер на Express.js. Группа: **ББМО-01-23**. Разработчик: **Шикель Никита**

## Запуск

```bash
npm install
npm start
```

Сервер стартует на `http://localhost:3000`, документация Swagger — на `http://localhost:3000/api-docs`.

Встроенный администратор для тестирования:
```
email: admin@lab16.local
password: admin123
```

## Task 1 — базовые страницы
- `GET /` — главная страница (группа, дата/время, список маршрутов по заданиям)
- `GET /about` — информация о разработчике
- `GET /contacts` — контакты

## Task 2 — REST API книг
- `GET /api/books`, `GET /api/books/:id`
- `POST /api/books`, `PUT /api/books/:id`, `DELETE /api/books/:id`
- `GET /api/books/search?author=...`

## Task 3 — middleware
- Логирование каждого запроса (консоль + файл `logs.txt`)
- Сжатие ответов (gzip/deflate)
- Rate limit: 100 запросов в минуту с одного IP (заголовки `RateLimit-*`)
- `GET /error`, `GET /async-error` — проверка обработчика ошибок

## Task 4 — фильтры, пагинация, сортировка, статистика
`GET /api/books?author=&year=&yearFrom=&yearTo=&sort=&search=&limit=&page=`
- `GET /api/books/stats` — статистика

## Task 5 — аутентификация, роли, Swagger, кэш

**Все маршруты `/api/books/*` требуют JWT**, поэтому сначала зарегистрируйся и
войди в систему.

1. Регистрация:
```bash
curl -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@mail.ru\",\"password\":\"12345\",\"name\":\"Тест\"}"
```
2. Вход (получение токена):
```bash
curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@mail.ru\",\"password\":\"12345\"}"
```
3. Используй полученный токен в каждом запросе к `/api/books`:
```bash
curl http://localhost:3000/api/books -H "Authorization: Bearer ВАШ_ТОКЕН"
```

Добавлять (`POST`) и удалять (`DELETE`) книги может **только администратор**
(используй `admin@lab16.local` / `admin123`, чтобы получить токен с ролью admin).

Дополнительные маршруты:
- `GET /api/books/export?format=csv|json`
- `POST /api/books/import` (тело — CSV-текст)
- `GET /api/books/recommendations?genre=...`
- `GET /api/books/available`
- `POST /api/books/:id/reviews`
- `GET /api/admin/dashboard` (только администратор)
