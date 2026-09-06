// hashmap — bảng băm địa chỉ mở TỰ VIẾT, khoá chuỗi. Xem main.cpp để biết vì sao.
// hashmap — a hand-written open-addressing hash table with string keys. See main.cpp.
import { Timer, Checksum, param, report } from '../_common/common.mjs';

function hashKey(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = (h ^ s.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

class Table {
  constructor(cap) {
    this.keys = new Array(cap).fill(null);
    this.vals = new Uint32Array(cap);
    this.mask = cap - 1;
  }

  // Ô trống là null, nên không cần mảng cờ riêng — bảng không bao giờ xoá.
  // An empty slot is null, so no separate flag array is needed: the table never deletes.
  put(k, v) {
    let i = hashKey(k) & this.mask;
    while (this.keys[i] !== null) {
      if (this.keys[i] === k) { this.vals[i] = v; return; }
      i = (i + 1) & this.mask;
    }
    this.keys[i] = k;
    this.vals[i] = v;
  }

  get(k) {
    let i = hashKey(k) & this.mask;
    while (this.keys[i] !== null) {
      if (this.keys[i] === k) return this.vals[i];
      i = (i + 1) & this.mask;
    }
    return -1;
  }
}

const n = param('n', 1000000);

const keys = new Array(n);
const absent = new Array(n >> 1);
for (let i = 0; i < n; i++) keys[i] = 'key' + i;
for (let i = 0; i < (n >> 1); i++) absent[i] = 'nokey' + i;

let cap = 1;
while (cap < n * 2) cap *= 2;

const t = new Timer();

const m = new Table(cap);
for (let i = 0; i < n; i++) m.put(keys[i], (i * 7) >>> 0);

let sum = 0, hits = 0, misses = 0;
for (let i = 0; i < n; i++) {
  const v = m.get(keys[i]);
  if (v !== -1) { hits += 1; sum = (sum + v) >>> 0; }
}
for (let i = 0; i < (n >> 1); i++) if (m.get(absent[i]) === -1) misses += 1;

const ms = t.ms();
const c = new Checksum();
c.add(sum); c.add(hits); c.add(misses);
report(ms, c.hex());
