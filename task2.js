const fs = require('fs').promises;
const path = require('path');

const projectDir = path.join('.', 'project_17');

async function createFolder(folderPath) {
    await fs.mkdir(folderPath, { recursive: true });
}

async function createInfoFile(folderPath, description) {
    const filePath = path.join(folderPath, 'info.txt');
    await fs.writeFile(filePath, description, 'utf8');
}

async function printTree(dir, prefix = '') {
    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
        const itemPath = path.join(dir, item.name);

        console.log(`${prefix}├── ${item.name}`);

        if (item.isDirectory()) {
            await printTree(itemPath, `${prefix}│   `);
        }
    }
}

async function main() {
    try {
        console.log('=== ЗАДАНИЕ 2 ===');

        const folders = [
            'src',
            'src/modules',
            'src/components',
            'src/utils',
            'data',
            'data/input',
            'data/output',
            'temp'
        ];

        for (const folder of folders) {
            const folderPath = path.join(projectDir, folder);
            await createFolder(folderPath);

            await createInfoFile(
                folderPath,
                `Назначение папки: ${folder}`
            );
        }

        for (let i = 1; i <= 3; i++) {
            const folderPath = path.join(
                projectDir,
                'src',
                'components',
                String(i)
            );

            await createFolder(folderPath);

            await createInfoFile(
                folderPath,
                `Вложенная папка ${i} для варианта 17`
            );
        }

        console.log('\nИсходное дерево:');
        console.log(`project_17/`);
        await printTree(projectDir);

        const tempPath = path.join(projectDir, 'temp');
        const newTempPath = path.join(projectDir, 'data', 'temp');

        await fs.rename(tempPath, newTempPath);

        // Переименовываем output в results
        const outputPath = path.join(projectDir, 'data', 'output');
        const resultsPath = path.join(projectDir, 'data', 'results');

        await fs.rename(outputPath, resultsPath);

        await fs.rm(newTempPath, {
            recursive: true,
            force: true
        });

        console.log('\nОбновлённое дерево:');
        console.log(`project_17/`);
        await printTree(projectDir);

        console.log('\nЗадание 2 выполнено успешно!');

    } catch (error) {
        console.error('Произошла ошибка:', error.message);
    }
}

main();