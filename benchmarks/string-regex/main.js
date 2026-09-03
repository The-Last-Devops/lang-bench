// string-regex — khớp regex trên 200k dòng log. Engine regex của V8 viết bằng C++.
// string-regex — match a regex over 200k log lines. V8's regex engine is written in C++.
import { Timer, Checksum, Lcg, param, report } from '../_common/common.mjs';

const PATTERN = /^(\d+\.\d+\.\d+\.\d+) - \[([0-9-]+)\] "(GET|POST) (\S+) HTTP\/1\.1" (\d{3}) (\d+)$/;

const n = param('n', 200000);

const lines = new Array(n);
const rng = new Lcg(42);
for (let i = 0; i < n; i++) {
  const a = rng.next() % 256;
  const b = rng.next() % 256;
  const day = (rng.next() % 28) + 1;
  const post = rng.next() % 4 === 0;
  let status = 200;
  if (rng.next() % 10 >= 8) status = rng.next() % 2 === 1 ? 404 : 500;
  const bytes = rng.next() % 100000;
  lines[i] = `10.0.${a}.${b} - [2026-08-${String(day).padStart(2, '0')}] "${post ? 'POST' : 'GET'} /path/${i} HTTP/1.1" ${status} ${bytes}`;
}

const t = new Timer();
let sumBytes = 0, ok200 = 0, posts = 0, matched = 0;
for (const line of lines) {
  const m = PATTERN.exec(line);
  if (m !== null) {
    matched++;
    if (m[3] === 'POST') posts++;
    if (Number(m[5]) === 200) ok200++;
    sumBytes = (sumBytes + Number(m[6])) >>> 0;
  }
}
const ms = t.ms();

const c = new Checksum();
c.add(sumBytes); c.add(ok200); c.add(posts); c.add(matched);
report(ms, c.hex());
