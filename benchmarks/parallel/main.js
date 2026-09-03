// parallel — chia matmul cho worker_threads. JavaScript đơn luồng, nhưng Node có
// worker thật; chúng dùng chung SharedArrayBuffer nên không phải copy dữ liệu.
// parallel — split matmul across worker_threads. JavaScript is single-threaded, but Node
// has real workers; they share a SharedArrayBuffer so no data is copied.
import { Worker } from 'node:worker_threads';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { Timer, Checksum, param, report } from '../_common/common.mjs';

const n = param('n', 256);
let threads = param('threads', 0);
if (threads <= 0) threads = os.availableParallelism ? os.availableParallelism() : os.cpus().length;

const ab = new SharedArrayBuffer(n * n * 8);
const bb = new SharedArrayBuffer(n * n * 8);
const cb = new SharedArrayBuffer(n * n * 8);
const a = new Float64Array(ab);
const b = new Float64Array(bb);
const c = new Float64Array(cb);
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    a[i * n + j] = (i * 31 + j * 17) % 100;
    b[i * n + j] = (i * 13 + j * 7) % 100;
  }
}

const workerPath = fileURLToPath(new URL('./worker.js', import.meta.url));

const t = new Timer();
await Promise.all(
  Array.from({ length: threads }, (_, w) => {
    const lo = Math.floor((n * w) / threads);
    const hi = Math.floor((n * (w + 1)) / threads);
    return new Promise((resolve, reject) => {
      const worker = new Worker(workerPath, { workerData: { n, lo, hi, ab, bb, cb } });
      worker.on('message', () => resolve());
      worker.on('error', reject);
    });
  })
);
let sum = 0;
for (let i = 0; i < c.length; i++) sum += c[i];
const ms = t.ms();

const ck = new Checksum();
ck.add((sum % 4294967296) >>> 0);
report(ms, ck.hex());
process.exit(0);
