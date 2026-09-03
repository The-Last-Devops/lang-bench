// file-io — ghi tuần tự rồi đọc lại 256 MB. Đo I/O đĩa, không đo CPU.
// file-io — write then read back 256 MB sequentially. This measures disk I/O, not CPU.
import fs from 'node:fs';
import path from 'node:path';
import { Timer, Checksum, param, report } from '../_common/common.mjs';

const mb = param('mb', 256);
const chunk = 1 << 20;
const dir = process.env.LB_TMPDIR || '/tmp';
const file = path.join(dir, 'lang-bench-io-node.bin');

// Buffer dựng MỘT LẦN, trước đồng hồ. / Buffer built ONCE, before the clock.
const buf = Buffer.allocUnsafe(chunk);
for (let j = 0; j < chunk; j++) buf[j] = (j * 31 + 7) & 0xff;

const t = new Timer();
let fd = fs.openSync(file, 'w');
for (let k = 0; k < mb; k++) fs.writeSync(fd, buf, 0, chunk);
fs.fsyncSync(fd);
fs.closeSync(fd);

// Chỉ cộng 4 KB đầu mỗi chunk để xác minh — xem ghi chú ở main.cpp.
// Verify by summing only the first 4 KB of each chunk — see the note in main.cpp.
const SAMPLE = 4096;
let sum = 0;
let totalRead = 0;
fd = fs.openSync(file, 'r');
for (let k = 0; k < mb; k++) {
  let got = 0;
  while (got < chunk) {
    const r = fs.readSync(fd, buf, got, chunk - got, null);
    if (r <= 0) break;
    got += r;
  }
  totalRead += got;
  const lim = Math.min(got, SAMPLE);
  for (let j = 0; j < lim; j++) sum = (sum + buf[j]) >>> 0;
}
fs.closeSync(fd);
const ms = t.ms();
fs.unlinkSync(file);

const c = new Checksum();
c.add(sum);
c.add(Math.floor(totalRead / 1048576) >>> 0);
c.add(mb >>> 0);
report(ms, c.hex());
