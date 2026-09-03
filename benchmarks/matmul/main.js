// matmul — nhân ma trận N×N kiểu ngây thơ, đo thông lượng số thực và cache.
// matmul — naive N×N matrix multiply, measuring float throughput and cache behaviour.
import { Timer, Checksum, param, report } from '../_common/common.mjs';

const n = param('n', 256);
const a = new Float64Array(n * n);
const b = new Float64Array(n * n);
const c = new Float64Array(n * n);
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    a[i * n + j] = (i * 31 + j * 17) % 100;
    b[i * n + j] = (i * 13 + j * 7) % 100;
  }
}

const t = new Timer();
for (let i = 0; i < n; i++) {
  for (let k = 0; k < n; k++) {
    const aik = a[i * n + k];
    for (let j = 0; j < n; j++) c[i * n + j] += aik * b[k * n + j];
  }
}
let sum = 0;
for (let i = 0; i < c.length; i++) sum += c[i];
const ms = t.ms();

const ck = new Checksum();
ck.add((sum % 4294967296) >>> 0);
report(ms, ck.hex());
