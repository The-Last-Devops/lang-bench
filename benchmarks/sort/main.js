// sort — merge sort đáy-lên TỰ VIẾT trên mảng số nguyên 32-bit.
// Xem main.cpp để biết vì sao bỏ sort của thư viện chuẩn.
// sort — a hand-written bottom-up merge sort over 32-bit integers.
// See main.cpp for why the standard library's sort was dropped.
import { Timer, Checksum, Lcg, param, report } from '../_common/common.mjs';

const n = param('n', 3000000);
let v = new Uint32Array(n);
let buf = new Uint32Array(n);
const rng = new Lcg(42);
for (let i = 0; i < n; i++) v[i] = rng.next();

const t = new Timer();

// Giữ tham chiếu tới mảng gốc: sau vòng lặp `v` có thể đang trỏ vào mảng phụ, và kết quả
// phải nằm đúng ở mảng gốc thì phần checksum bên dưới mới đọc đúng.
// Keep a handle on the original array: after the loop `v` may point at the scratch one, and
// the result has to end up in the original for the checksum below to read it.
const original = v;
for (let width = 1; width < n; width *= 2) {
  for (let lo = 0; lo < n; lo += width * 2) {
    const mid = Math.min(lo + width, n);
    const hi = Math.min(lo + width * 2, n);
    let i = lo, j = mid, k = lo;
    while (i < mid && j < hi) buf[k++] = v[i] <= v[j] ? v[i++] : v[j++];
    while (i < mid) buf[k++] = v[i++];
    while (j < hi) buf[k++] = v[j++];
  }
  const tmp = v; v = buf; buf = tmp;
}
if (v !== original) original.set(v);

const ms = t.ms();

let sum = 0;
for (let i = 0; i < n; i += 1000) sum = (sum + original[i]) >>> 0;
const c = new Checksum();
c.add(original[0]); c.add(original[n - 1]); c.add(sum);
report(ms, c.hex());
