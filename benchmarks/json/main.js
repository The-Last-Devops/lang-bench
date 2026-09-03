// json — dựng 100k record, serialize ra chuỗi, parse lại, đọc số liệu.
// JSON.parse / JSON.stringify là code C bên trong V8, không phải JavaScript.
// json — build 100k records, serialize to a string, parse it back, read the fields.
// JSON.parse / JSON.stringify are C code inside V8, not JavaScript.
import { Timer, Checksum, param, report } from '../_common/common.mjs';

const n = param('n', 100000);

const t = new Timer();
const docs = new Array(n);
for (let i = 0; i < n; i++) {
  docs[i] = { id: i, name: 'user' + i, score: (i * 37) % 1000, active: i % 3 === 0 };
}
const text = JSON.stringify(docs);
const back = JSON.parse(text);

let sumId = 0, sumScore = 0, active = 0;
for (const rec of back) {
  sumId = (sumId + rec.id) >>> 0;
  sumScore = (sumScore + rec.score) >>> 0;
  if (rec.active) active++;
}
const ms = t.ms();

const c = new Checksum();
c.add(sumId); c.add(sumScore); c.add(active); c.add(text.length >>> 0);
report(ms, c.hex());
