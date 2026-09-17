const fs = require('fs').promises;
const path = require('path');

const VARIANT = '17';

const statistics = {
    files: 0,
    folders: 0,
    totalSize: 0,
    extensions: {},
    allFiles: [],
    matchingFiles: []
};

async function scanDirectory(directory) {
    const items = await fs.readdir(directory, { withFileTypes: true });

    for (const item of items) {
        const itemPath = path.join(directory, item.name);

        try {
            if (item.isDirectory()) {
                statistics.folders++;

                await scanDirectory(itemPath);
            } else {
                const fileInfo = await fs.stat(itemPath);
                const extension = path.extname(item.name).toLowerCase() || '[без расширения]';

                statistics.files++;
                statistics.totalSize += fileInfo.size;

                if (!statistics.extensions[extension]) {
                    statistics.extensions[extension] = {
                        count: 0,
                        size: 0
                    };
                }

                statistics.extensions[extension].count++;
                statistics.extensions[extension].size += fileInfo.size;

                statistics.allFiles.push({
                    name: item.name,
                    path: itemPath,
                    size: fileInfo.size
                });

                if (item.name.includes(VARIANT)) {
                    statistics.matchingFiles.push(itemPath);
                }
            }
        } catch (error) {
            console.error(`Ошибка при обработке ${itemPath}: ${error.message}`);
        }
    }
}

function formatSize(bytes) {
    if (bytes < 1024) {
        return `${bytes} Б`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(2)} КБ`;
    }

    return `${(bytes / 1024 / 1024).toFixed(2)} МБ`;
}

function printExtensions() {
    console.log('\n📂 Расширения файлов:');

    for (const [extension, data] of Object.entries(statistics.extensions)) {
        console.log(
            `${extension}: ${data.count} файлов (${formatSize(data.size)})`
        );
    }
}

function printTopFiles() {
    const sortedFiles = [...statistics.allFiles]
        .sort((a, b) => b.size - a.size);

    console.log('\n🏆 Топ-5 самых больших файлов:');

    sortedFiles.slice(0, 5).forEach((file, index) => {
        console.log(
            `${index + 1}. ${file.name} (${formatSize(file.size)}) - ${file.path}`
        );
    });

    console.log('\n📄 Топ-5 самых маленьких файлов:');

    sortedFiles
        .slice(-5)
        .reverse()
        .forEach((file, index) => {
            console.log(
                `${index + 1}. ${file.name} (${formatSize(file.size)}) - ${file.path}`
            );
        });
}

async function createReport() {
    const report = {
        variant: 17,
        filesCount: statistics.files,
        foldersCount: statistics.folders,
        totalSizeBytes: statistics.totalSize,
        totalSizeKB: Number((statistics.totalSize / 1024).toFixed(2)),
        totalSizeMB: Number(
            (statistics.totalSize / 1024 / 1024).toFixed(2)
        ),
        extensions: statistics.extensions,
        filesWithVariantNumber: statistics.matchingFiles
    };

    const reportPath = path.join('.', 'report_17.json');

    await fs.writeFile(
        reportPath,
        JSON.stringify(report, null, 4),
        'utf8'
    );

    console.log(`\n📄 Отчёт сохранён: ${reportPath}`);
}

async function main() {

    const inputPath = process.argv[2] || '.';

    const directoryPath = path.resolve(inputPath);

    try {
        const info = await fs.stat(directoryPath);

        if (!info.isDirectory()) {
            console.error('Указанный путь не является директорией.');
            return;
        }

        console.log('📊 Анализ директории:', inputPath);

        await scanDirectory(directoryPath);

        console.log('\n📁 Общее количество папок:', statistics.folders);
        console.log('📄 Общее количество файлов:', statistics.files);
        console.log(
            '💾 Общий размер:',
            formatSize(statistics.totalSize),
            `(${statistics.totalSize} байт)`
        );

        printExtensions();
        printTopFiles();

        console.log('\n🔎 Файлы, содержащие "17" в названии:');

        if (statistics.matchingFiles.length === 0) {
            console.log('Файлы не найдены.');
        } else {
            statistics.matchingFiles.forEach(file => {
                console.log(`- ${file}`);
            });
        }

        await createReport();

    } catch (error) {
        console.error('Ошибка:', error.message);
    }
}

main();