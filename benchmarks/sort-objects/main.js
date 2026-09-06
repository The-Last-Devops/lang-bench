// sort-objects — merge sort đáy-lên TỰ VIẾT trên mảng bản ghi. Xem main.cpp để biết vì sao.
//
// Vẫn dùng object thật chứ không phải hai mảng phẳng song song: chi phí truy cập thuộc tính
// và cách V8 bố trí object trong bộ nhớ chính là thứ bài này muốn đo ở phía JS.
//
// sort-objects — a hand-written bottom-up merge sort over records. See main.cpp for why.
//
// Real objects rather than two parallel flat arrays: property access and the way V8 lays an
// object out in memory are exactly what this benchmark is meant to measure on the JS side.
import { Timer, Checksum, Lcg, param, report } from '../_common/common.mjs';

const n = param('n', 400000);

const rng = new Lcg(99);
let v = new Array(n);
let buf = new Array(n);
for (let i = 0; i < n; i++) v[i] = { key: rng.next(), id: i };

const before = (a, b) => (a.key !== b.key ? a.key < b.key : a.id < b.id);

const t = new Timer();

const original = v;
for (let width = 1; width < n; width *= 2) {
  for (let lo = 0; lo < n; lo += width * 2) {
    const mid = Math.min(lo + width, n);
    const hi = Math.min(lo + width * 2, n);
    let i = lo, j = mid, k = lo;
    while (i < mid && j < hi) buf[k++] = before(v[j], v[i]) ? v[j++] : v[i++];
    while (i < mid) buf[k++] = v[i++];
    while (j < hi) buf[k++] = v[j++];
  }
  const tmp = v; v = buf; buf = tmp;
}
if (v !== original) for (let i = 0; i < n; i++) original[i] = v[i];

let sum = 0;
for (let i = 0; i < n; i++) {
  sum = (sum + Math.imul(i + 1, (original[i].key ^ original[i].id) >>> 0)) >>> 0;
}
const ms = t.ms();

const c = new Checksum();
c.add(sum);
c.add(original[0].key);
c.add(original[n - 1].key);
report(ms, c.hex());
