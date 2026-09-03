// fib — đệ quy thuần, đo chi phí gọi hàm và stack.
// fib — plain recursion, measuring call and stack cost.
import { Timer, Checksum, param, report } from '../_common/common.mjs';

function fib(n) {
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}

const n = param('n', 32);
const t = new Timer();
const v = fib(n);
const ms = t.ms();
const c = new Checksum();
c.add(v >>> 0);
report(ms, c.hex());
