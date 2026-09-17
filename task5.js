const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { ZipArchive } = require('archiver');
const VARIANT = 17;

const sourceDir = path.join('.', `source_${VARIANT}`);
const backupDir = path.join('.', `backup_${VARIANT}`);
const zipFile = path.join('.', `backup_17.zip`);
const reportFile = path.join('.', `sync_report_${VARIANT}.txt`);

async function createTestStructure() {
    await fsp.mkdir(sourceDir, { recursive: true });

    const extensions = [
        '.txt', '.js', '.json', '.md', '.css',
        '.html', '.csv', '.xml', '.log', '.cfg',
        '.ini', '.dat', '.tmp', '.sample', '.txt',
        '.js', '.json', '.txt', '.md', '.txt'
    ];

    for (let i = 1; i <= 20; i++) {
        const fileName = `file${i}${extensions[i - 1]}`;
        const filePath = path.join(sourceDir, fileName);

        await fsp.writeFile(
            filePath,
            `Тестовый файл ${i}, вариант ${VARIANT}\n`,
            'utf8'
        );
    }

    for (let i = 1; i <= 3; i++) {
        const folderPath = path.join(sourceDir, `folder${i}`);

        await fsp.mkdir(folderPath, { recursive: true });

        for (let j = 1; j <= 2; j++) {
            const filePath = path.join(
                folderPath,
                `inner${j}.txt`
            );

            await fsp.writeFile(
                filePath,
                `Вложенный файл ${j} в папке ${i}\n`,
                'utf8'
            );
        }
    }

    console.log(`✅ Создана структура ${sourceDir}`);
}

async function getFiles(directory, baseDirectory = directory) {
    const result = [];

    const items = await fsp.readdir(directory, {
        withFileTypes: true
    });

    for (const item of items) {
        const fullPath = path.join(directory, item.name);

        if (item.isDirectory()) {
            const nested = await getFiles(fullPath, baseDirectory);
            result.push(...nested);
        } else {
            const stat = await fsp.stat(fullPath);

            result.push({
                fullPath,
                relativePath: path.relative(baseDirectory, fullPath),
                size: stat.size,
                modified: stat.mtimeMs
            });
        }
    }

    return result;
}

function copyWithStream(source, destination) {
    return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(source);
        const writeStream = fs.createWriteStream(destination);

        readStream.on('error', reject);
        writeStream.on('error', reject);
        writeStream.on('finish', resolve);

        readStream.pipe(writeStream);
    });
}

async function copyFile(source, destination) {
    await fsp.mkdir(path.dirname(destination), {
        recursive: true
    });

    const extension = path.extname(source).toLowerCase();
    const stat = await fsp.stat(source);

    if (
        extension === '.txt' ||
        extension === '.js' ||
        extension === '.json'
    ) {
        await copyWithStream(source, destination);
        return 'stream';
    }


    if (stat.size > 1024 * 1024) {
        const bufferSize = 512 * 1024;

        const input = await fsp.open(source, 'r');
        const output = await fsp.open(destination, 'w');

        const buffer = Buffer.alloc(bufferSize);
        let position = 0;

        try {
            while (position < stat.size) {
                const { bytesRead } = await input.read(
                    buffer,
                    0,
                    buffer.length,
                    position
                );

                if (bytesRead === 0) {
                    break;
                }

                await output.write(
                    buffer,
                    0,
                    bytesRead,
                    position
                );

                position += bytesRead;
            }
        } finally {
            await input.close();
            await output.close();
        }

        return 'chunks';
    }

    await fsp.copyFile(source, destination);

    return 'normal';
}

// Копирование всей директории
async function copyDirectory() {
    const files = await getFiles(sourceDir);

    let streamCount = 0;
    let normalCount = 0;
    let chunkCount = 0;

    console.log(`\n📂 Исходная директория: ${sourceDir}`);
    console.log(`📂 Директория назначения: ${backupDir}`);
    console.log(`📋 Обнаружено файлов: ${files.length}`);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        const destination = path.join(
            backupDir,
            file.relativePath
        );

        const type = await copyFile(
            file.fullPath,
            destination
        );

        if (type === 'stream') {
            streamCount++;
        } else if (type === 'chunks') {
            chunkCount++;
        } else {
            normalCount++;
        }

        console.log(
            `⏳ Прогресс копирования: ${i + 1}/${files.length} файлов`
        );
    }

    console.log('\n✅ Копирование завершено!');
    console.log(`- Потоковое копирование: ${streamCount}`);
    console.log(`- Обычное копирование: ${normalCount}`);
    console.log(`- Копирование чанками: ${chunkCount}`);

    return files;
}

async function createZip() {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipFile);

        const archive = new ZipArchive({
            zlib: { level: 9 }
        });

        output.on('close', () => {
            console.log(`\n📦 ZIP-архив создан: ${zipFile}`);
            console.log(
                `Размер архива: ${archive.pointer()} байт`
            );
            resolve();
        });

        output.on('error', reject);
        archive.on('error', reject);

        archive.pipe(output);

        archive.directory(
            sourceDir,
            `source_${VARIANT}`
        );

        archive.finalize();
    });
}

async function synchronize() {
    const sourceFiles = await getFiles(sourceDir);
    const backupFiles = await getFiles(backupDir);

    const sourceMap = new Map(
        sourceFiles.map(file => [file.relativePath, file])
    );

    const backupMap = new Map(
        backupFiles.map(file => [file.relativePath, file])
    );

    const added = [];
    const deleted = [];
    const changed = [];
    const same = [];

    for (const [relativePath, sourceFile] of sourceMap) {
        if (!backupMap.has(relativePath)) {
            added.push(relativePath);
        } else {
            const backupFile = backupMap.get(relativePath);

            if (
                sourceFile.size !== backupFile.size ||
                sourceFile.modified !== backupFile.modified
            ) {
                changed.push(relativePath);
            } else {
                same.push(relativePath);
            }
        }
    }

    for (const relativePath of backupMap.keys()) {
        if (!sourceMap.has(relativePath)) {
            deleted.push(relativePath);
        }
    }

    const report = [
        'ОТЧЁТ СИНХРОНИЗАЦИИ',
        '====================',
        '',
        `Исходная директория: ${sourceDir}`,
        `Директория резервной копии: ${backupDir}`,
        '',
        `Совпадают: ${same.length}`,
        `Изменены: ${changed.length}`,
        `Добавлены: ${added.length}`,
        `Удалены: ${deleted.length}`,
        '',
        'Изменённые файлы:',
        ...changed.map(file => `- ${file}`),
        '',
        'Добавленные файлы:',
        ...added.map(file => `- ${file}`),
        '',
        'Удалённые файлы:',
        ...deleted.map(file => `- ${file}`)
    ].join('\n');

    await fsp.writeFile(reportFile, report, 'utf8');

    console.log('\n🔄 Сравнение директорий:');
    console.log(`- Совпадают: ${same.length}`);
    console.log(`- Изменены: ${changed.length}`);
    console.log(`- Добавлены: ${added.length}`);
    console.log(`- Удалены: ${deleted.length}`);

    console.log(`\n📄 Отчёт сохранён: ${reportFile}`);
}

async function main() {
    try {
        console.log('=== ЗАДАНИЕ 5 ===\n');

        await createTestStructure();

        await copyDirectory();

        await synchronize();

        // Дополнительное условие варианта 17
        await createZip();

        console.log('\n✅ Задание 5 выполнено полностью!');
    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
    }
}

main();