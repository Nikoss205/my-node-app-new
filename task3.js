const fs = require('fs').promises;
const path = require('path');

async function runTask3() {
  const sourceFolder = path.join('.', 'project', 'src');
  const backupFolder = path.join('.', 'project', 'backup');

  try {
    // 1. Создаем папку backup, если её нет
    await fs.mkdir(backupFolder, { recursive: true });

    // 2. Получаем список элементов в папке src
    const items = await fs.readdir(sourceFolder, { withFileTypes: true });

    for (const item of items) {
      const srcPath = path.join(sourceFolder, item.name);
      const destPath = path.join(backupFolder, item.name);

      if (item.isFile()) {
        // Копируем файлы
        await fs.copyFile(srcPath, destPath);
        console.log('Скопирован файл: ' + item.name);
      } else if (item.isDirectory()) {
        // Копируем папки (требуется recursive: true)
        await fs.cp(srcPath, destPath, { recursive: true });
        console.log('Скопирована директория: ' + item.name);
      }
    }

    console.log('\nРезервное копирование успешно завершено!');

  } catch (error) {
    console.error('Ошибка при выполнении Задания 3:', error.message);
  }
}

runTask3();