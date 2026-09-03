// crypto-hash — SHA-256 trên 200 MB. node:crypto gọi thẳng vào OpenSSL.
// crypto-hash — SHA-256 over 200 MB. node:crypto calls straight into OpenSSL.
import { createHash } from 'node:crypto';
import { Timer, Checksum, param, report } from '../_common/common.mjs';

const iters = param('iters', 200);
const chunk = 1 << 20;

const buf = Buffer.allocUnsafe(chunk);
for (let i = 0; i < chunk; i++) buf[i] = (i * 31 + 7) & 0xff;

const t = new Timer();
const h = createHash('sha256');
for (let k = 0; k < iters; k++) h.update(buf);
const digest = h.digest();
const ms = t.ms();

const head = ((digest[0] << 24) | (digest[1] << 16) | (digest[2] << 8) | digest[3]) >>> 0;
const c = new Checksum();
c.add(head);
c.add(iters >>> 0);
report(ms, c.hex());
