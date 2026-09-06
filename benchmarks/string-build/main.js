// string-build — nối chuỗi và định dạng số, việc mà code thật làm nhiều nhất (log,
// template, sinh HTML). Cách mỗi ngôn ngữ biểu diễn chuỗi lộ ra rõ nhất ở đây.
// string-build — appending and number formatting, the thing real code does most (logs,
// templates, HTML). How a language represents strings shows up most sharply here.
import { Timer, Checksum, param, report } from '../_common/common.mjs';

const n = param('n', 400000);
const t = new Timer();

// Nối thẳng vào một chuỗi, đúng cách người ta viết trong JS. V8 dùng cons-string nên
// phép nối rẻ, còn chi phí dồn sang lúc đọc — bài test đọc lại toàn bộ nên tính cả hai.
// Plain concatenation, the way this is actually written in JS. V8 uses cons-strings, so
// appending is cheap and the cost moves to reading; the benchmark reads it all back, so
// both halves are counted.
// Chuyển số bằng tay, không dùng phép nối ngầm number+string — xem main.cpp để biết vì sao.
// Hand-rolled conversion instead of the implicit number+string coercion — see main.cpp.
const DIGITS = '0123456789';
let s = '';
for (let i = 0; i < n; i++) {
  let v = i % 1000;
  let d = '';
  do { d = DIGITS[v % 10] + d; v = (v / 10) | 0; } while (v);
  s += d + ',';
}

// Cộng có trọng số theo vị trí: đổi chỗ hai ký tự là checksum đổi, khác với cộng thuần.
// A position-weighted sum: swapping two characters changes it, unlike a plain sum.
let sum = 0;
for (let i = 0; i < s.length; i++) {
  sum = (sum + (i + 1) * s.charCodeAt(i)) >>> 0;
}

const ms = t.ms();
const c = new Checksum();
c.add(sum);
c.addU64(BigInt(s.length));
report(ms, c.hex());
