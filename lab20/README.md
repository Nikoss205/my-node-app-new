# Лабораторна робота №20 — HTTP

**Студент:** Шикель Никита  
**Група:** ББМО-01-23  
**Стек:** Node.js (вбудовані модулі `http`, `https`, `fs`, `path`, `crypto`).

## Структура

П'ять файлів завдань розміщені безпосередньо в корені репозиторію:

```text
http-lab/
├── http-basic.js
├── http-headers.js
├── http-body.js
├── http-routing.js
├── http-advanced.js
├── public/
│   ├── index.html
│   └── about.html
├── certs/                 # локальний самопідписаний сертифікат (не для production)
├── package.json
├── .gitignore
└── README.md
```

## Вимоги

- Node.js 18 або новіший.
- Зовнішні npm-залежності не потрібні.

## Запуск

У терміналі з кореня проєкту:

```bash
npm run check
npm run task1   # http://localhost:3000
npm run task2   # http://localhost:3001
npm run task3   # http://localhost:3002
npm run task4   # http://localhost:3003
npm run task5   # http://localhost:3004
```

Кожне завдання запускається в окремому терміналі. Зупинка сервера: `Ctrl+C`.

## Завдання 1 — базовий HTTP-сервер

Маршрути `GET /`, `GET /about`, відповідь `404`, журнал запитів. Підтримується також `HEAD`.

```bash
curl -i http://localhost:3000/
curl -i http://localhost:3000/about
curl -i http://localhost:3000/missing
```

## Завдання 2 — HTTP-заголовки

- `GET /headers` — демонстрація заголовків відповіді.
- `GET /headers/set` — власні заголовки відповіді.
- `GET /headers/check` — відображення вибраних заголовків запиту.

```bash
curl -i http://localhost:3001/headers
curl -i http://localhost:3001/headers/set
curl -i -H "X-Student: Shikel-Nikita" -H "X-Group: BBMO-01-23" http://localhost:3001/headers/check
```

У HTTP-заголовках використовується ASCII-значення `BBMO-01-23`, оскільки Node.js не дозволяє передавати кирилицю в сирих значеннях заголовків. Повна назва групи залишається в тілі відповіді.

## Завдання 3 — тіло запиту

- `POST /echo` — приймає JSON або звичайний текст.
- `POST /form` — приймає `application/x-www-form-urlencoded`.

```bash
curl -i -X POST http://localhost:3002/echo \
  -H "Content-Type: application/json" \
  -d '{"message":"Привіт","task":3}'

curl -i -X POST http://localhost:3002/echo \
  -H "Content-Type: text/plain" \
  --data "Hello from curl"

curl -i -X POST http://localhost:3002/form \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "name=Nikita&subject=HTTP"
```

## Завдання 4 — маршрутизація та CRUD

API студентів:

| Метод | Шлях | Призначення |
|---|---|---|
| GET | `/api/students` | список студентів |
| GET | `/api/students?group=ББМО-01-23` | фільтр за групою |
| GET | `/api/students/1` | один студент |
| POST | `/api/students` | створити студента |
| PUT | `/api/students/1` | оновити студента |
| DELETE | `/api/students/1` | видалити студента |

```bash
curl http://localhost:3003/api/students
curl "http://localhost:3003/api/students?group=ББМО-01-23"
curl -i -X POST http://localhost:3003/api/students \
  -H "Content-Type: application/json" \
  -d '{"name":"Никита Шикель","group":"ББМО-01-23"}'
curl -i -X PUT http://localhost:3003/api/students/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Оновлене ім’я"}'
curl -i -X DELETE http://localhost:3003/api/students/2
curl -i -X PATCH http://localhost:3003/api/students
```

Дані зберігаються в пам'яті процесу й скидаються після перезапуску.

## Завдання 5 — розширені можливості

- Статичні файли: `/static/` та `/static/about.html`.
- ETag та умовний запит `If-None-Match` (відповідь `304`).
- Метрики: `/metrics`.
- Потокова передача: `/stream` (п'ять фрагментів).
- Захист від path traversal: `403 Forbidden`.
- Необов'язковий HTTPS на порту `3443`.

```bash
curl -i http://localhost:3004/static/
curl -i http://localhost:3004/static/about.html
curl -i http://localhost:3004/metrics
curl -N http://localhost:3004/stream
```

Перевірка ETag:

```bash
curl -i http://localhost:3004/static/about.html
# Скопіюйте ETag з відповіді та підставте його нижче:
curl -i -H 'If-None-Match: "ETAG_VALUE"' http://localhost:3004/static/about.html
```

Перевірка path traversal (важливо: `--path-as-is` не дає curl нормалізувати `..`):

```bash
curl --path-as-is -i http://localhost:3004/static/../secret.txt
# Очікувано: HTTP 403
```

### HTTPS / сертифікат

У репозиторії передбачено запуск HTTPS, якщо наявні файли сертифіката. Для локальної демонстрації створіть самопідписаний сертифікат командою OpenSSL:

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout certs/localhost-key.pem \
  -out certs/localhost-cert.pem \
  -days 365 \
  -subj "/CN=localhost"
```

Після цього перезапустіть `npm run task5`. HTTPS буде доступний на `https://localhost:3443`:

```bash
curl -k -i https://localhost:3443/
curl -k -i https://localhost:3443/metrics
```

`-k` потрібен лише тому, що сертифікат самопідписаний. Не використовуйте цей сертифікат у production.

## Git та Pull Request

```bash
git checkout -b feature/lab20-http
git add .
git commit -m "Complete Lab 20 HTTP tasks"
git push -u origin feature/lab20-http
```

Створіть Pull Request у GitHub:

- **Title:** `Lab 20 Shikel Nikita`
- **Description:** див. шаблон нижче.

## Текст опису Pull Request

### Лабораторна робота №20 — HTTP

**Студент:** Шикель Никита  
**Група:** ББМО-01-23

- **Задание 1.** Базовий HTTP-сервер: головна сторінка, about, 404 та логування.
- **Задание 2.** HTTP-заголовки запиту й відповіді, власні заголовки.
- **Задание 3.** Обробка JSON, текстового тіла та form-urlencoded.
- **Задание 4.** REST API студентів: CRUD, фільтрація та обробка непідтримуваних методів.
- **Задание 5.** Статичні файли, ETag, метрики, streaming, захист від path traversal та HTTPS.

### Результати перевірки

Додайте скриншоти терміналу під відповідними пунктами:
1. `Задание 1` — `/`, `/about`, 404.
2. `Задание 2` — `/headers`, `/headers/set`, `/headers/check`.
3. `Задание 3` — JSON echo та form.
4. `Задание 4` — CRUD і фільтрація.
5. `Задание 5` — static, ETag, `/metrics`, `/stream`, 403 traversal, HTTPS.

> Скриншоти потрібно зробити після запуску команд у власному середовищі та прикріпити до PR. У цьому архіві вони не підміняються несправжніми зображеннями результатів.
