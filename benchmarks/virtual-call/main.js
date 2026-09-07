// virtual-call — gọi phương thức trên mảng trộn lẫn bốn lớp. Xem main.cpp để biết vì sao.
//
// Với V8 đây là chỗ gọi MEGAMORPHIC: bốn hình dạng object khác nhau đi qua cùng một chỗ gọi,
// nên inline cache bị tràn và V8 phải tra bảng mỗi lần. Mảng cùng một lớp sẽ được inline và
// bài test mất hết ý nghĩa.
//
// virtual-call — method dispatch over an array of four mixed classes. See main.cpp for why.
//
// For V8 this is a MEGAMORPHIC call site: four distinct object shapes flow through one call,
// so the inline cache overflows and V8 falls back to a lookup each time. An array of one
// class would be inlined and the benchmark would mean nothing.
import { Timer, Checksum, Lcg, param, report } from '../_common/common.mjs';

class Square { constructor(a) { this.a = a; } area() { return Math.imul(this.a, this.a) >>> 0; } }
class Rect { constructor(a, b) { this.a = a; this.b = b; } area() { return Math.imul(this.a, this.b) >>> 0; } }
class Tri { constructor(a, b) { this.a = a; this.b = b; } area() { return (Math.imul(this.a, this.b) >>> 0) / 2 | 0; } }
class Line { constructor(a) { this.a = a; } area() { return this.a; } }

const n = param('n', 1000000);
const passes = param('passes', 20);

const rng = new Lcg(5);
const v = new Array(n);
for (let i = 0; i < n; i++) {
  const kind = rng.next() % 4;
  const a = rng.next() % 1000;
  const b = rng.next() % 1000;
  v[i] = kind === 0 ? new Square(a) : kind === 1 ? new Rect(a, b) : kind === 2 ? new Tri(a, b) : new Line(a);
}

const t = new Timer();
let sum = 0;
for (let p = 0; p < passes; p++) {
  for (let i = 0; i < n; i++) sum = (sum + v[i].area()) >>> 0;
}
const ms = t.ms();

const c = new Checksum();
c.add(sum);
c.add(passes);
report(ms, c.hex());
