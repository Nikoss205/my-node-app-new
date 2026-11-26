# Лабораторная работа №19: Исследование методов работы модуля Events

Группа ББМО-01-23. Node.js ≥ 18.3, внешних зависимостей нет (`npm install` не нужен).

```
lab19/
├── events-basic.js       Задание 1: EventEmitter, подписка, возвращаемое значение emit()
├── events-once.js        Задание 2: on / once / addListener, управление подписками, порядок вызова
├── events-class.js       Задание 3: class DatabaseConnection extends EventEmitter, «ошибка как событие»
├── events-advanced.js    Задание 4: newListener, removeListener, плагины, утечка, async-слушатели
├── event-bus.js          Задание 5: демонстрация EventBus + интеграция с os и http
├── src/
│   ├── EventBus.js       класс EventBus (приоритеты, wildcard, once, ошибки, метрики)
│   ├── system-monitor.js интеграция с os: замеры CPU/RAM -> события system:sample, system:alert
│   ├── server.js         интеграция с http: событие request, GET /metrics, GET /emit/<событие>
│   └── format.js         склонение слов («1 раз», «3 раза»)
└── tests/                30 тестов (npm test)
```

## Задание 1
```bash
node events-basic.js
```
Скриншоты: запуск, вывод всех событий, значения `emit()` (`false` без слушателей, `true` со слушателями).

## Задание 2
```bash
node events-once.js
```
Разделы вывода: сравнение `on` и `once`, `addListener`, управление подписками (`listenerCount`, `listeners`, `removeListener`, `removeAllListeners`), порядок вызова (+ `prependListener`).

## Задание 3
```bash
node events-class.js           # connect, query, close, error; без слушателя error показано через try/catch
node events-class.js --crash   # настоящее падение процесса (код возврата 1) — для скриншота «падения без слушателя error»
```
Класс `DatabaseConnection` — в начале `events-class.js` (для скриншота класса). БД — учебная, в памяти (50 студентов).
Ошибки внутри `query` (нет соединения, неподдерживаемый запрос) тоже идут через событие `error`, а не исключением.

## Задание 4
```bash
node events-advanced.js
```
Разделы: система плагинов (`newListener` / `removeListener`), очистка ресурсов, утечка слушателей, асинхронные слушатели.
- `newListener` эмитится **перед** добавлением слушателя, `removeListener` — **после** удаления.
- В разделе «утечка» Node.js сам печатает `MaxListenersExceededWarning` (в stderr) — это тоже стоит показать на скриншоте.
- Асинхронные слушатели: `emit` не ждёт `async`-функцию; `setImmediate` откладывает работу; `captureRejections: true` отправляет ошибку async-слушателя в событие `error`.

## Задание 5
```bash
node event-bus.js                # демонстрация + HTTP-сервер на http://localhost:3000, Ctrl+C для выхода
node event-bus.js --port 3001    # другой порт
node event-bus.js --no-server    # только демонстрация (и один замер os), без сервера
```
В **другом** терминале, пока сервер работает:
```bash
curl http://localhost:3000/metrics
curl "http://localhost:3000/emit/greet?arg=Ivan"     # эмитит событие greet
```
В Windows PowerShell `curl` — это псевдоним `Invoke-WebRequest`; используйте `curl.exe http://localhost:3000/metrics`
или `Invoke-RestMethod http://localhost:3000/metrics`. Или просто откройте адрес в браузере.
Кириллицу в URL нужно кодировать (`?arg=%D0%98%D0%B2%D0%B0%D0%BD`), иначе Node.js отклонит запрос.

Как устроен `EventBus` (`src/EventBus.js`):
- слушатели хранит сам `EventEmitter`, поэтому работают `listenerCount`, `listeners`, `removeListener`, события `newListener`/`removeListener`;
- каждая подписка оборачивается в функцию с полями `priority` и `seq`; `emit` сортирует их по убыванию приоритета, при равенстве — по порядку добавления;
- `once` удаляет слушателя перед первым вызовом (и защищён от повторного вызова при вложенном `emit`);
- `onAny(listener)` — wildcard: получает `(имя события, ...аргументы)`, вызывается раньше обычных слушателей;
- исключение в слушателе (в том числе отклонённый промис async-слушателя) не мешает остальным: оно превращается в событие `error` с аргументами `(err, имя_события)`;
  слушатель `error` можно подписать с высоким приоритетом; если слушателей `error` нет — ошибка пишется в stderr в формате `[ERROR] [ББМО-01-23] ...`, процесс не падает;
- `getMetrics()`: счётчики вызовов по событиям, число ошибок, `total`, время последнего вызова, число слушателей.

Интеграция: `src/system-monitor.js` (модуль `os`) эмитит `system:sample` и `system:alert`; `src/server.js` (модуль `http`) эмитит `request` на каждый запрос.
Сервер слушает только `127.0.0.1`; служебные события (`error`, `newListener`, `removeListener`) через `/emit/` эмитить нельзя.
Счётчики в `/metrics` включают и сам запрос `/metrics`, и внутренние события шины (например, `error`).

## Тесты
```bash
npm test
```
Юнит-тесты `EventBus` (приоритеты, once, wildcard, ошибки, метрики), тест HTTP-сервера и дымовые тесты запуска всех пяти скриптов.
