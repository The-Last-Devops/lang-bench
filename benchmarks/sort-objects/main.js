// sort-objects — sắp xếp mảng bản ghi bằng hàm so sánh. Xem main.cpp để biết vì sao.
// Dùng object thật chứ không phải mảng phẳng: chi phí truy cập thuộc tính và gọi callback
// cho từng cặp chính là thứ bài này muốn đo ở JS.
// sort-objects — sorting records through a comparator. See main.cpp for why.
// Real objects rather than a flat array: property access and the per-pair callback are
// exactly what this benchmark is meant to measure in JS.
import { Timer, Checksum, Lcg, param, report } from '../_common/common.mjs';

const n = param('n', 1000000);

const rng = new Lcg(99);
const v = new Array(n);
for (let i = 0; i < n; i++) v[i] = { key: rng.next(), id: i };

const t = new Timer();
v.sort((a, b) => (a.key !== b.key ? a.key - b.key : a.id - b.id));
let sum = 0;
for (let i = 0; i < n; i++) {
  sum = (sum + Math.imul(i + 1, (v[i].key ^ v[i].id) >>> 0)) >>> 0;
}
const ms = t.ms();

const c = new Checksum();
c.add(sum);
c.add(v[0].key);
c.add(v[n - 1].key);
report(ms, c.hex());
