const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const readline = require('readline');

const VARIANT = 17;
const TOTAL_LINES = 100000;

const inputFile = path.join('.', `data_${VARIANT}.txt`);
const outputFile = path.join('.', `processed_${VARIANT}.txt`);

async function generateFile() {
    try {
        const handle = await fsp.open(inputFile, 'w');

        for (let i = 1; i <= TOTAL_LINES; i++) {
            const number = Math.floor(Math.random() * 1000) + 1;
            await handle.write(`${i}, ${number}, Вариант ${VARIANT}\n`);
        }

        await handle.close();

        console.log(`✅ Файл ${inputFile} создан.`);
        console.log(`Количество строк: ${TOTAL_LINES}`);
    } catch (error) {
        console.error('Ошибка при создании файла:', error.message);
        throw error;
    }
}

async function processFile() {
    const numbers = [];

    let count = 0;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;

    const startTime = Date.now();

    const stats = await fsp.stat(inputFile);

    console.log(`\n📊 Обработка файла: ${inputFile}`);
    console.log(
        `Размер файла: ${(stats.size / 1024 / 1024).toFixed(2)} МБ`
    );

    const stream = fs.createReadStream(inputFile, {
        encoding: 'utf8',
        highWaterMark: 64 * 1024
    });

    const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity
    });

    let nextProgress = 10;

    for await (const line of rl) {
        if (!line.trim()) {
            continue;
        }

        const parts = line.split(',');

        const number = Number(parts[1]?.trim());

        if (!Number.isNaN(number)) {
            numbers.push(number);

            count++;
            sum += number;

            if (number > max) {
                max = number;
            }

            if (number < min) {
                min = number;
            }

            if (count >= TOTAL_LINES * nextProgress / 100) {
                console.log(
                    `⏳ Прогресс: ${nextProgress}% (${count.toLocaleString()} строк обработано)`
                );
                nextProgress += 10;
            }
        }
    }

    numbers.sort((a, b) => a - b);

    let median;

    if (numbers.length % 2 === 0) {
        const middle = numbers.length / 2;

        median = (numbers[middle - 1] + numbers[middle]) / 2;
    } else {
        median = numbers[Math.floor(numbers.length / 2)];
    }

    const average = sum / count;

    const result = [
        `Результаты обработки файла data_${VARIANT}.txt`,
        '',
        `Всего строк: ${count}`,
        `Сумма чисел: ${sum}`,
        `Среднее значение: ${average.toFixed(2)}`,
        `Максимальное число: ${max}`,
        `Минимальное число: ${min}`,
        `Медиана: ${median}`,
        ''
    ].join('\n');

    await fsp.writeFile(outputFile, result, 'utf8');

    const executionTime = (Date.now() - startTime) / 1000;

    console.log('\n✅ Обработка завершена!');
    console.log('📊 Результаты:');
    console.log(`- Всего строк: ${count.toLocaleString()}`);
    console.log(`- Сумма чисел: ${sum.toLocaleString()}`);
    console.log(`- Среднее значение: ${average.toFixed(2)}`);
    console.log(`- Максимальное число: ${max}`);
    console.log(`- Минимальное число: ${min}`);
    console.log(`- Медиана: ${median}`);
    console.log(`📄 Результаты сохранены в: ${outputFile}`);
    console.log(`⏱ Время выполнения: ${executionTime.toFixed(2)} сек`);
}

async function main() {
    try {
        try {
            await fsp.access(inputFile);
            console.log(`📁 Файл ${inputFile} уже существует.`);
        } catch {
            await generateFile();
        }

        await processFile();

    } catch (error) {
        console.error('\n❌ Произошла ошибка:', error.message);
    }
}

main();