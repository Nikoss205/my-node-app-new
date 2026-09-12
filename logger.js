const fs = require('fs');

function setupLogger(app) {
    function writeLog(event, data) {
        const time = new Date().toISOString();
        const logMessage = `[time]{time}]time]{event}: ${JSON.stringify(data)}\n`;

        fs.appendFile('logs.txt', logMessage, (error) => {
            if (error) {
                console.error('Ошибка записи лога:', error);
            }
        });
    }

    app.on('server:started', (port) => {
        writeLog('server:started', { port });
    });

    app.on('server:stopped', () => {
        writeLog('server:stopped', {});
    });

    app.on('request:received', (request) => {
        writeLog('request:received', request);
    });
}

module.exports = { setupLogger };
