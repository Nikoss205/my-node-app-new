const http = require('http');
const EventEmitter = require('events');
const logger = require('./logger');

function calculatePi(iterations = 10000000) {
    let pi = 0;

    for (let i = 0; i < iterations; i++) {
        const term = 1 / (2 * i + 1);

        if (i % 2 === 0) {
            pi += term;
        } else {
            pi -= term;
        }
    }

    return (Math.floor(pi * 4 * 10000000) / 10000000).toFixed(7);
}


class AppServer extends EventEmitter {
    constructor() {
        super();

        this.server = http.createServer((req, res) => {
            this.emit('request:received', {
                url: req.url,
                method: req.method
            });

            // Обработка заказа
            if (req.method === 'GET' && req.url.startsWith('/order/')) {
                const orderId = req.url.split('/')[2];

                orderHandler.processOrder(orderId);

                res.writeHead(200, {
                    'Content-Type': 'text/plain; charset=utf-8'
                });

                res.end(`Заказ #${orderId} принят в обработку`);
                return;
            }

            // Ответ на остальные запросы
            res.writeHead(200, {
                'Content-Type': 'text/plain; charset=utf-8'
            });

            res.end('Hello from Event-Driven Server!');
        });
    }

    start(port) {
        this.server.listen(port, () => {
            this.emit('server:started', port);
        });
    }

    stop() {
        this.server.close(() => {
            this.emit('server:stopped');
        });
    }
}


class OrderHandler extends EventEmitter {
    processOrder(orderId) {
        this.emit('order:start', orderId);

        setTimeout(() => {
            this.emit('order:processing', 'Идёт обработка...');

            setTimeout(() => {
                const sum = Math.floor(Math.random() * 901) + 100;

                this.emit('order:complete', {
                    orderId: orderId,
                    sum: sum
                });
            }, 2000);

        }, 2000);
    }
}


class UserTracker extends EventEmitter {
    trackAction(userId, action, metadata) {
        const eventData = {
            userId: userId,
            action: action,
            timestamp: new Date().toISOString(),
            metadata: metadata,
            id: Math.random().toString(36).substr(2, 9)
        };

        this.emit('user:action', eventData);
    }
}


const app = new AppServer();


app.on('server:started', (port) => {
    console.log(`🚀 Сервер запущен на порту ${port}`);
});

app.on('request:received', (request) => {
    console.log(`📨 Получен запрос: ${request.method} ${request.url}`);
});

app.on('server:stopped', () => {
    console.log('🛑 Сервер остановлен');
});


const orderHandler = new OrderHandler();

orderHandler.on('order:start', (orderId) => {
    console.log(`→ [order:start] Заказ #${orderId} начат`);
});

orderHandler.on('order:processing', (message) => {
    console.log(`→ [order:processing] ${message}`);
});

orderHandler.on('order:complete', (order) => {
    const pi = calculatePi();

    console.log(
        `💰 Заказ #${order.orderId} завершён на сумму ${order.sum} руб. PI = ${pi}`
    );
});


const userTracker = new UserTracker();

userTracker.on('user:action', (data) => {
    console.log(`👤 Пользователь ${data.userId} совершил действие "${data.action}"`);
    console.log(`Время: ${data.timestamp}`);
    console.log(`ID события: ${data.id}`);
    console.log(`Доп. данные: ${JSON.stringify(data.metadata)}`);
    console.log('------------------------------');
});


userTracker.trackAction(
    1,
    'Вход в систему',
    { browser: 'Chrome', device: 'PC' }
);

userTracker.trackAction(
    2,
    'Оформление заказа',
    { orderId: 42, amount: 756 }
);


logger.setupLogger(app);


app.start(3000);

setTimeout(() => {
    app.stop();
}, 10000);