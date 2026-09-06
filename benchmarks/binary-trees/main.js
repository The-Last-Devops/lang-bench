// binary-trees — dựng rồi huỷ hàng loạt cây nhị phân. Đo chi phí cấp phát và thu hồi
// bộ nhớ theo cụm nhỏ, ngắn hạn — nơi bộ cấp phát và GC lộ rõ nhất sự khác nhau.
// binary-trees — build and tear down many binary trees. This measures the cost of
// small, short-lived allocations in bulk, where allocators and GCs differ most.
import { Timer, Checksum, param, report } from '../_common/common.mjs';

function build(depth) {
  return depth > 0 ? { l: build(depth - 1), r: build(depth - 1) } : { l: null, r: null };
}

function check(n) {
  return n.l === null ? 1 : 1 + check(n.l) + check(n.r);
}

const maxDepth = param('depth', 16);
const t = new Timer();

let total = 0n;
for (let d = 4; d <= maxDepth; d += 2) {
  // Cây càng nông thì dựng càng nhiều, để mỗi vòng làm lượng việc tương đương.
  // Shallower trees are built more often, so every round does comparable work.
  const iters = 2 ** (maxDepth - d + 4);
  for (let i = 0; i < iters; i++) {
    total += BigInt(check(build(d)));
    // Cây thành rác ngay tại đây — phần dọn dẹp thuộc về GC, và đó là thứ đang đo.
    // The tree becomes garbage right here; cleaning up is the GC's job, and that is what is being measured.
  }
}

const ms = t.ms();
const c = new Checksum();
c.addU64(total & 0xffffffffffffffffn);
report(ms, c.hex());
