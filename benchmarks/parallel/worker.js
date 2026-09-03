// Worker cho bài parallel: nhận một dải hàng và nhân phần của mình.
// Worker for the parallel benchmark: takes a row range and multiplies its share.
import { parentPort, workerData } from 'node:worker_threads';

const { n, lo, hi, ab, bb, cb } = workerData;
const a = new Float64Array(ab);
const b = new Float64Array(bb);
const c = new Float64Array(cb);

for (let i = lo; i < hi; i++) {
  for (let k = 0; k < n; k++) {
    const aik = a[i * n + k];
    for (let j = 0; j < n; j++) c[i * n + j] += aik * b[k * n + j];
  }
}
parentPort.postMessage('done');
