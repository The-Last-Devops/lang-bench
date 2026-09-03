// alloc-gc — cấp rồi thả hàng triệu object nhỏ, để GC của V8 tự dọn.
// alloc-gc — allocate and drop millions of small objects, letting V8's GC clean up.
import { Timer, Checksum, Lcg, param, report } from '../_common/common.mjs';

const batches = param('batches', 400);
const per = param('per', 5000);
const rng = new Lcg(42);

const t = new Timer();
let total = 0;
for (let b = 0; b < batches; b++) {
  let head = null;
  for (let i = 0; i < per; i++) head = { value: rng.next(), next: head };
  for (let p = head; p !== null; p = p.next) total = (total + p.value) >>> 0;
  head = null; // thả tham chiếu / drop the reference
}
const ms = t.ms();

const c = new Checksum();
c.add(total);
c.add((batches * per) >>> 0);
report(ms, c.hex());
