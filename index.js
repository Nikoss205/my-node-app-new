const http = require('http');

function calculatePi(digits) {
    const size = Math.floor(digits * 10 / 3) + 1;
    const numbers = new Array(size).fill(2);
    let result = '';
    let nines = 0;
    let predigit = 0;

    for (let j = 0; j < digits; j++) {
        let q = 0;

        for (let i = size; i > 0; i--) {
            const x = 10 * numbers[i - 1] + q * i;
            const b = 2 * i - 1;
            numbers[i - 1] = x % b;
            q = Math.floor(x / b);
        }

        numbers[0] = q % 10;
        q = Math.floor(q / 10);

        if (q === 9) {
            nines++;
        } else if (q === 10) {
            result += String(predigit + 1);
            for (let k = 0; k < nines; k++) {
                result += '0';
            }
            predigit = 0;
            nines = 0;
        } else {
            result += String(predigit);
            predigit = q;
            for (let k = 0; k < nines; k++) {
                result += '9';
            }
            nines = 0;
        }
    }

    result += String(predigit);
    return result[0] + '.' + result.slice(1, digits + 1);
}

const studentName = "Sycheuski Maksim Vasilyevich";
const group = "401";
const journalNumber = 17;

const pi = calculatePi(journalNumber);

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
        <h1>${studentName}</h1>
        <h2>Group: ${group}</h2>
        <h2>Num PI: (${journalNumber}): ${pi}</h2>
    `);
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});