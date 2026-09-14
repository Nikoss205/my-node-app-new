const FileManagerHybrid = require('./fileOperationsHybrid');

const fileManager = new FileManagerHybrid('./test-data-hybrid');

console.log('=== ТЕСТИРОВАНИЕ ГИБРИДНОГО ПОДХОДА ===\n');

async function runTests() {
    try {
        // Работа через промисы
        console.log('1. Создание файла через промис...');

        const filePath = await fileManager.createFile(
            'promise.txt',
            'Файл создан через промис'
        );

        console.log(`✅ Создан: ${filePath}`);

        // Работа через колбэк
        console.log('\n2. Чтение файла через колбэк...');

        fileManager.readFileCallback('promise.txt', (err, content) => {
            if (err) {
                console.error('❌ Ошибка:', err.message);
                return;
            }

            console.log(`✅ Содержимое: "${content}"`);

            // Ошибка чтения несуществующего файла
            console.log('\n3. Проверка обработки ошибки...');

            fileManager.readFileUniversal('missing.txt', (err, data) => {
                if (err) {
                    console.log(`✅ Ошибка обработана: ${err.code}`);
                } else {
                    console.log(`Содержимое: ${data}`);
                }

                // Создание файла через колбэк
                console.log('\n4. Создание файла через колбэк...');

                fileManager.createFileCallback(
                    'callback.txt',
                    'Файл создан через колбэк',
                    (err, callbackPath) => {
                        if (err) {
                            console.error('❌ Ошибка:', err.message);
                            return;
                        }

                        console.log(`✅ Создан: ${callbackPath}`);

                        // Чтение через промис
                        console.log('\n5. Чтение файла через промис...');

                        fileManager.readFile('callback.txt')
                            .then((content) => {
                                console.log(`✅ Содержимое: "${content}"`);

                                // Удаление файлов
                                console.log('\n6. Удаление файлов...');

                                return Promise.all([
                                    fileManager.deleteFile('promise.txt'),
                                    fileManager.deleteFile('callback.txt')
                                ]);
                            })
                            .then(() => {
                                console.log('✅ Файлы удалены');
                                console.log('\n✅ Все тесты завершены!');
                            })
                            .catch((error) => {
                                console.error('❌ Ошибка:', error.message);
                            });
                    }
                );
            });
        });

    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

runTests();