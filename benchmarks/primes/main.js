// primes — sàng Eratosthenes, đo vòng lặp chặt và truy cập mảng lớn.
// primes — sieve of Eratosthenes, measuring tight loops over a large array.
import { Timer, Checksum, param, report } from '../_common/common.mjs';

const n = param('n', 10000000);
const t = new Timer();
const composite = new Uint8Array(n + 1);
for (let i = 2; i * i <= n; i++) {
  if (composite[i] === 0) {
    for (let j = i * i; j <= n; j += i) composite[j] = 1;
  }
}

let count = 0;
let sum = 0;
for (let i = 2; i <= n; i++) {
  if (composite[i] === 0) {
    count++;
    sum = (sum + i) >>> 0;
  }
}
const ms = t.ms();

const c = new Checksum();
c.add(count);
c.add(sum);
report(ms, c.hex());
