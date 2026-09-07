// lru-cache — cache LRU TỰ VIẾT: bảng băm cộng danh sách liên kết đôi trên mảng phẳng.
// Không dùng Map, dù Map của JS vốn giữ thứ tự chèn — đó lại là so thư viện.
// Xem main.cpp để biết vì sao dùng dây xích thay cho địa chỉ mở.
// lru-cache — a hand-written LRU cache: a hash table plus a doubly linked list over flat arrays.
// Map is not used even though JS's Map preserves insertion order: that would compare libraries.
// See main.cpp for why this chains instead of open-addressing.
import { Timer, Checksum, Lcg, param, report } from '../_common/common.mjs';

const cap = param('cap', 100000);
const ops = param('ops', 2000000);
const space = cap * 3;

const keys = new Uint32Array(ops);
const rng = new Lcg(31);
for (let i = 0; i < ops; i++) keys[i] = rng.next() % space;

let buckets = 1;
while (buckets < cap * 2) buckets *= 2;
const mask = buckets - 1;

const head = new Int32Array(buckets).fill(-1);
const next = new Int32Array(cap).fill(-1);
const key = new Uint32Array(cap);
const val = new Uint32Array(cap);
const prevL = new Int32Array(cap).fill(-1);
const nextL = new Int32Array(cap).fill(-1);
let lruHead = -1, lruTail = -1, used = 0;

const t = new Timer();

let hits = 0, misses = 0, sum = 0;

for (let i = 0; i < ops; i++) {
  const k = keys[i];
  const b = Math.imul(k, 2654435761) & mask;

  let node = head[b];
  while (node >= 0 && key[node] !== k) node = next[node];

  if (node >= 0) {
    hits += 1;
    sum = (sum + val[node]) >>> 0;
    if (lruHead !== node) {
      const p = prevL[node], nx = nextL[node];
      if (p >= 0) nextL[p] = nx;
      if (nx >= 0) prevL[nx] = p;
      if (lruTail === node) lruTail = p;
      prevL[node] = -1;
      nextL[node] = lruHead;
      if (lruHead >= 0) prevL[lruHead] = node;
      lruHead = node;
    }
    continue;
  }

  misses += 1;
  let slot;
  if (used < cap) {
    slot = used++;
  } else {
    slot = lruTail;
    const ob = Math.imul(key[slot], 2654435761) & mask;
    let cur = head[ob], prev = -1;
    while (cur >= 0 && cur !== slot) { prev = cur; cur = next[cur]; }
    if (prev >= 0) next[prev] = next[slot];
    else head[ob] = next[slot];

    const p = prevL[slot];
    if (p >= 0) nextL[p] = -1;
    lruTail = p;
    if (lruHead === slot) lruHead = -1;
  }

  key[slot] = k;
  val[slot] = (k * 2 + 1) >>> 0;
  next[slot] = head[b];
  head[b] = slot;

  prevL[slot] = -1;
  nextL[slot] = lruHead;
  if (lruHead >= 0) prevL[lruHead] = slot;
  lruHead = slot;
  if (lruTail < 0) lruTail = slot;
}

const ms = t.ms();
const c = new Checksum();
c.add(hits);
c.add(misses);
c.add(sum);
report(ms, c.hex());
