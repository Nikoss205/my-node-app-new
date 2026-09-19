const fs = require('fs').promises;
const path = require('path');

async function runTask1() {
  try {
    const fileName = 'student.txt';
    const filePath = path.join('.', fileName);

    const currentDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    const lines = [
      'Студент: Иванов Иван',
      'Группа: ИС-202',
      'Дата: ${currentDate}',
      'Любимые книги:',
      '1. "Война и мир" Л. Толстой',
      '2. "Преступление и наказание" Ф. Достоевский',
      '3. "Мастер и Маргарита" М. Булгаков',
      '4. "1984" Дж. Оруэлл',
      '5. "Гарри Поттер" Дж. Роулинг'
    ];

    await fs.writeFile(filePath, lines.join('\n') + '\n', 'utf-8');

    const currentContent = await fs.readFile(filePath, 'utf-8');
    const totalLines = currentContent.trim().split('\n').length;
    await fs.appendFile(filePath, 'Количество записей: ${totalLines + 1}\n', 'utf-8');

    const finalContent = await fs.readFile(filePath, 'utf-8');
    console.log('Создан файл: ${fileName}');
    console.log('Содержимое файла:');
    console.log(finalContent);

  } catch (error) {
    console.error('Ошибка при выполнении Задания 1:', error.message);
  }
}

runTask1();