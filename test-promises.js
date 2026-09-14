const FileManagerPromises = require('./fileOperationsPromises');

const fileManager = new FileManagerPromises('./test-data-promises');

async function testFileOperations() {

console.log('=== ТЕСТИРОВАНИЕ ПРОМИСОВ ===\n');

try {

console.log('1. Создание файла...');

const filePath = await fileManager.createFile(
'test1.txt',
'Привет из промисов!'
);

console.log(Файл создан: ${filePath});


console.log('\n2. Чтение файла...');

const content = await fileManager.readFile('test1.txt');

console.log(Содержимое: "${content}");


console.log('\n3. Получение статистики...');

const stats = await fileManager.getFileStats('test1.txt');

console.log('Статистика:');
console.log(Размер: ${stats.size} байт);
console.log(Создан: ${stats.created});
console.log(Изменён: ${stats.modified});


console.log('\n4. Создание нескольких файлов параллельно...');

const files = [
{
filename: 'test2.txt',
content: 'Второй файл'
},
{
filename: 'test3.txt',
content: 'Третий файл'
},
{
filename: 'test4.txt',
content: 'Четвёртый файл'
}
];

const paths = await fileManager.createMultipleFiles(files);

console.log('Создано файлов: ${paths.length}');

paths.forEach(p => console.log(- ${p}));


console.log('\n5. Список файлов...');

const fileList = await fileManager.listFiles();

console.log(Найдено файлов: ${fileList.length});

fileList.forEach(f => console.log(- ${f}));


console.log('\n6. Чтение нескольких файлов параллельно...');

const contents = await fileManager.readMultipleFiles(fileList);

console.log('Содержимое файлов:');

Object.entries(contents).forEach(([filename, content]) => {
console.log(- ${filename}: "${content}");
});


console.log('\n7. Очистка...');

for (const file of fileList) {
await fileManager.deleteFile(file);
console.log(${file} удалён);
}

console.log('\nВсе операции завершены!');
console.log('Код стал намного чище и читаемее!');

} catch (error) {

console.error('\nОшибка:', error.message);
console.error('Stack:', error.stack);
}
}

testFileOperations();