// hashmap — chèn và tra cứu khóa chuỗi, đo Map của JavaScript.
// hashmap — insert and look up string keys, measuring JavaScript's Map.
import { Timer, Checksum, param, report } from '../_common/common.mjs';

const n = param('n', 1000000);
const t = new Timer();
const m = new Map();
for (let i = 0; i < n; i++) m.set('key' + i, (i * 7) >>> 0);

let sum = 0, hits = 0, misses = 0;
for (let i = 0; i < n; i++) {
  const v = m.get('key' + i);
  if (v !== undefined) {
    hits++;
    sum = (sum + v) >>> 0;
  }
}
for (let i = 0; i < n / 2; i++) {
  if (!m.has('nokey' + i)) misses++;
}
const ms = t.ms();

const c = new Checksum();
c.add(sum); c.add(hits); c.add(misses);
report(ms, c.hex());
