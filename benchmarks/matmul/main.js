// matmul — nhân ma trận N×N kiểu ngây thơ trên số nguyên, đo thông lượng vòng lặp chặt
// và hành vi cache. Xem ghi chú trong main.cpp về lý do bỏ f64.
//
// JS không có mảng số nguyên 64-bit chạy nhanh — BigInt64Array chậm hơn hàng chục lần và
// sẽ phạt oan Node. Nhưng mọi giá trị ở đây đều nhỏ: tích tối đa 99×99, mỗi ô cộng dồn
// tối đa 2.5 triệu, tổng cuối khoảng 1.6e11 — đều nằm gọn trong 2^53, tức Float64Array
// biểu diễn CHÍNH XÁC TUYỆT ĐỐI. Checksum vì thế khớp đúng với i64 của ba ngôn ngữ kia.
//
// JS has no fast 64-bit integer array — BigInt64Array is an order of magnitude slower and
// would penalise Node unfairly. But every value here is small: products cap at 99×99, a
// cell accumulates to at most 2.5 million, and the final sum is about 1.6e11 — all well
// inside 2^53, so Float64Array represents them EXACTLY. The checksum therefore matches
// the i64 of the other three languages.
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
ck.addU64(BigInt(sum));
report(ms, ck.hex());
