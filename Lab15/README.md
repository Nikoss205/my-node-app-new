# Лабораторная работа №15 — Koa.js

Простой сервер на Koa.js. Группа: **ББМО-01-23**

## Запуск

```bash
npm install
npm start
```

Сервер стартует на `http://localhost:3000`.

## Маршруты

| Метод  | Путь                 | Описание                                  |
|--------|----------------------|--------------------------------------------|
| GET    | /                    | HTML-страница лабораторной                |
| GET    | /api/users           | Список пользователей                       |
| POST   | /api/users           | Добавить пользователя                      |
| PUT    | /api/users/:id       | Обновить пользователя                      |
| DELETE | /api/users/:id       | Удалить пользователя                       |
| GET    | /protected           | Требует заголовок Authorization            |
| GET    | /error               | Тестовая ошибка (проверка error-middleware)|
| GET    | /students            | Список студентов (filter/sort/search/page) |
| GET    | /students/:id        | Один студент                               |
| POST   | /students            | Добавить студента                          |
| PUT    | /students/:id        | Обновить студента                          |
| DELETE | /students/:id        | Удалить студента                           |

## Примеры query-параметров для /students

- `/students?group=ББМО-01-23`
- `/students?limit=5&offset=10`
- `/students?sort=name` или `/students?sort=-name` или `/students?sort=course`
- `/students?search=Ан`
