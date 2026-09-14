const FileManager = require('./fileOperations');
const FileManagerPromises = require('./fileOperationsPromises');

const callbackManager = new FileManager('./performance-callbacks');
const promiseManager = new FileManagerPromises('./performance-promises');

const FILE_COUNT = 100;

function testCallbacks() {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        let completed = 0;

        for (let i = 1; i <= FILE_COUNT; i++) {
            callbackManager.createFile(
                `file${i}.txt`,
                `Содержимое файла ${i}`,
                err => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    completed++;

                    if (completed === FILE_COUNT) {
                        const end = Date.now();
                        resolve(end - start);
                    }
                }
            );
        }
    });
}

async function testPromises() {
    const start = Date.now();

    const files = [];

    for (let i = 1; i <= FILE_COUNT; i++) {
        files.push({
            filename: `file${i}.txt`,
            content: `Содержимое файла ${i}`
        });
    }

    await promiseManager.createMultipleFiles(files);

    const end = Date.now();
    return end - start;
}

async function main() {
    console.log('=== ИССЛЕДОВАНИЕ ПРОИЗВОДИТЕЛЬНОСТИ ===');
    console.log(`Количество файлов: ${FILE_COUNT}`);

    const callbackTime = await testCallbacks();
    console.log(`Время выполнения с callback: ${callbackTime} мс`);

    const promiseTime = await testPromises();
    console.log(`Время выполнения с Promise: ${promiseTime} мс`);

    console.log('\n=== РЕЗУЛЬТАТ ===');

    if (callbackTime < promiseTime) {
        console.log('Callback-метод оказался быстрее.');
    } else if (promiseTime < callbackTime) {
        console.log('Promise-метод оказался быстрее.');
    } else {
        console.log('Оба метода показали одинаковое время.');
    }

    console.log('\nВывод: Promise-код обычно проще для чтения,');
    console.log('а callback-код позволяет напрямую работать');
    console.log('с асинхронными операциями Node.js.');
}

main().catch(err => {
    console.error('Ошибка:', err.message);
});