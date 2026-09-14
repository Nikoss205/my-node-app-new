const fs = require('fs');
const path = require('path');

class FileManagerHybrid {
    constructor(baseDir = './data-hybrid') {
        this.baseDir = baseDir;

        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
            console.log(`Создана директория: ${this.baseDir}`);
        }
    }

    // Создание файла с использованием промиса
    createFile(filename, content) {
        const filePath = path.join(this.baseDir, filename);

        return fs.promises.writeFile(filePath, content, 'utf8')
            .then(() => filePath);
    }

    // Чтение файла с использованием промиса
    readFile(filename) {
        const filePath = path.join(this.baseDir, filename);

        return fs.promises.readFile(filePath, 'utf8');
    }

    // Получение статистики с использованием промиса
    getFileStats(filename) {
        const filePath = path.join(this.baseDir, filename);

        return fs.promises.stat(filePath)
            .then((stats) => ({
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                isFile: stats.isFile()
            }));
    }

    // Удаление файла с использованием промиса
    deleteFile(filename) {
        const filePath = path.join(this.baseDir, filename);

        return fs.promises.unlink(filePath);
    }

    // Список файлов с использованием промиса
    listFiles() {
        return fs.promises.readdir(this.baseDir);
    }

    // Создание файла с колбэком
    createFileCallback(filename, content, callback) {
        const filePath = path.join(this.baseDir, filename);

        fs.writeFile(filePath, content, 'utf8', (err) => {
            if (err) {
                callback(err, null);
                return;
            }

            callback(null, filePath);
        });
    }

    // Чтение файла с колбэком
    readFileCallback(filename, callback) {
        const filePath = path.join(this.baseDir, filename);

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                callback(err, null);
                return;
            }

            callback(null, data);
        });
    }

    // Получение статистики с колбэком
    getFileStatsCallback(filename, callback) {
        const filePath = path.join(this.baseDir, filename);

        fs.stat(filePath, (err, stats) => {
            if (err) {
                callback(err, null);
                return;
            }

            callback(null, {
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                isFile: stats.isFile()
            });
        });
    }

    // Удаление файла с колбэком
    deleteFileCallback(filename, callback) {
        const filePath = path.join(this.baseDir, filename);

        fs.unlink(filePath, (err) => {
            if (err) {
                callback(err);
                return;
            }

            callback(null);
        });
    }

    // Универсальный метод чтения
    readFileUniversal(filename, callback) {
        this.readFile(filename)
            .then((content) => callback(null, content))
            .catch((err) => callback(err, null));
    }
}

module.exports = FileManagerHybrid;