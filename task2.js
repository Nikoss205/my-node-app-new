const fs = require('fs').promises;
const path = require('path');

async function printTree(dirPath, indent) {
  if (!indent) indent = '';
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    for (const item of items) {
      console.log(indent + '├── ' + item.name);
      if (item.isDirectory()) {
        await printTree(path.join(dirPath, item.name), indent + '│   ');
      }
    }
  } catch (error) {
    console.error('Ошибка при чтении дерева:', error.message);
  }
}

async function runTask2() {
  const rootDir = path.join('.', 'project');

  try {
    const directories = [
      path.join(rootDir, 'src', 'modules'),
      path.join(rootDir, 'src', 'components'),
      path.join(rootDir, 'src', 'utils'),
      path.join(rootDir, 'data', 'input'),
      path.join(rootDir, 'data', 'output'),
      path.join(rootDir, 'temp')
    ];

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
    }

    const allFolders = [rootDir, path.join(rootDir, 'src'), path.join(rootDir, 'data')].concat(directories);
    for (const folder of allFolders) {
      await fs.writeFile(path.join(folder, 'info.txt'), 'Назначение папки: ' + path.basename(folder), 'utf-8');
    }

    for (let i = 1; i <= 3; i++) {
      await fs.mkdir(path.join(rootDir, 'src', 'components', String(i)), { recursive: true });
    }

    console.log('\nДерево структуры:');
    console.log(rootDir);
    await printTree(rootDir);

    const tempOldPath = path.join(rootDir, 'temp');
    const tempNewPath = path.join(rootDir, 'data', 'temp');
    await fs.rename(tempOldPath, tempNewPath);

    const outputOldPath = path.join(rootDir, 'data', 'output');
    const outputNewPath = path.join(rootDir, 'data', 'results');
    await fs.rename(outputOldPath, outputNewPath);

    await fs.rm(tempNewPath, { recursive: true, force: true });

    console.log('\nОбновленное дерево структуры:');
    console.log(rootDir);
    await printTree(rootDir);

  } catch (error) {
    console.error('Ошибка при выполнении Задания 2:', error.message);
  }
}

runTask2();