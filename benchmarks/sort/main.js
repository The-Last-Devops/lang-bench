// sort — sắp xếp mảng số nguyên 32-bit. Uint32Array.sort() là sort số thật,
// không phải Array.sort() so sánh theo chuỗi, nên đây mới là phép so sánh đúng.
// sort — sort 32-bit integers. Uint32Array.sort() is a true numeric sort, unlike
// Array.sort() which compares as strings, so this is the fair counterpart.
import { Timer, Checksum, Lcg, param, report } from '../_common/common.mjs';

const n = param('n', 3000000);
const v = new Uint32Array(n);
const rng = new Lcg(42);
for (let i = 0; i < n; i++) v[i] = rng.next();

const t = new Timer();
v.sort();
const ms = t.ms();

let sum = 0;
for (let i = 0; i < n; i += 1000) sum = (sum + v[i]) >>> 0;
const c = new Checksum();
c.add(v[0]); c.add(v[n - 1]); c.add(sum);
report(ms, c.hex());
