const fs = require('fs').promises;
const path = require('path');

async function main() {
    // Имя файла для 17 варианта
    const fileName = 'student_17.txt';

    // Формируем относительный путь к файлу
    const filePath = path.join('.', fileName);

    try {
        // Получаем текущую дату и время
        const now = new Date();
        const dateTime = now.toLocaleString('ru-RU');

        // Данные студента
        const studentData = [
            'Студент: Сычевский Максим Васильевич',
            'Группа: 401',
            'Вариант: 17',
            `Дата: ${dateTime}`,
            '',
            'Любимые книги:',
            '1. "Ведьмак" - А. Сапковский',
            '2. "Преступление и наказание" - Ф. Достоевский',
            '3. "Мастер и Маргарита" - М. Булгаков',
            '4. "1984" - Дж. Оруэлл',
            '5. "Гарри Поттер" - Дж. Роулинг'
        ];

        const content = studentData.join('\n');

        await fs.writeFile(filePath, content, 'utf8');

        console.log(`Создан файл: ${fileName}`);

        const linesCount = studentData.length;

        await fs.appendFile(
            filePath,
            `\nКоличество записей: ${linesCount}`,
            'utf8'
        );

        const fileContent = await fs.readFile(filePath, 'utf8');

        console.log('\nСодержимое файла:');
        console.log('─────────────────────────────────');
        console.log(fileContent);
        console.log('─────────────────────────────────');

    } catch (error) {
        console.error('Произошла ошибка:', error.message);
    }
}

main();