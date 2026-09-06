// dijkstra — đường đi ngắn nhất trên đồ thị thưa sinh sẵn, dùng heap nhị phân tự viết.
// Đo truy cập bộ nhớ rải rác cộng với một cấu trúc dữ liệu có nhánh rẽ khó đoán.
// dijkstra — shortest paths over a generated sparse graph using a hand-written binary
// heap. This measures scattered memory access plus a data structure whose branches
// the CPU cannot predict.
import { Timer, Checksum, Lcg, param, report } from '../_common/common.mjs';

const n = param('n', 200000);
const deg = param('deg', 8);

// Đồ thị dựng ở dạng CSR bằng cùng một LCG ở cả bốn ngôn ngữ. Phần dựng nằm ngoài
// đồng hồ — bài này đo tìm đường, không đo sinh dữ liệu.
// CSR graph built from the same LCG in all four languages. Construction sits outside
// the clock: this benchmark measures the search, not the data generation.
const head = new Int32Array(n + 1);
const to = new Int32Array(n * deg);
const w = new Uint32Array(n * deg);
const rng = new Lcg(12345);
for (let i = 0; i <= n; i++) head[i] = i * deg;
for (let i = 0; i < to.length; i++) {
  to[i] = rng.next() % n;
  w[i] = 1 + (rng.next() % 1000);
}

const t = new Timer();

// Khoảng cách vượt 2^32 nên phải dùng Float64Array: số nguyên tới 2^53 vẫn chính xác
// tuyệt đối, còn Uint32Array thì tràn âm thầm và cho ra checksum sai.
// Distances exceed 2^32, so Float64Array is required: integers up to 2^53 stay exact,
// whereas Uint32Array would overflow silently and produce a wrong checksum.
const INF = Infinity;
const dist = new Float64Array(n).fill(INF);

let hd = new Float64Array(1 << 16);
let hv = new Int32Array(1 << 16);
let hn = 0;

function push(d, v) {
  if (hn === hd.length) {
    const nd = new Float64Array(hn * 2); nd.set(hd); hd = nd;
    const nv = new Int32Array(hn * 2); nv.set(hv); hv = nv;
  }
  hd[hn] = d; hv[hn] = v;
  let i = hn++;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (hd[p] <= hd[i]) break;
    let td = hd[p]; hd[p] = hd[i]; hd[i] = td;
    let tv = hv[p]; hv[p] = hv[i]; hv[i] = tv;
    i = p;
  }
}

function pop() {
  const last = --hn;
  hd[0] = hd[last]; hv[0] = hv[last];
  let i = 0;
  for (;;) {
    const l = i * 2 + 1, r = l + 1;
    let m = i;
    if (l < hn && hd[l] < hd[m]) m = l;
    if (r < hn && hd[r] < hd[m]) m = r;
    if (m === i) break;
    let td = hd[m]; hd[m] = hd[i]; hd[i] = td;
    let tv = hv[m]; hv[m] = hv[i]; hv[i] = tv;
    i = m;
  }
}

dist[0] = 0;
push(0, 0);
while (hn > 0) {
  const d = hd[0], u = hv[0];
  pop();
  if (d > dist[u]) continue; // bản cũ đã lỗi thời / a stale copy
  for (let e = head[u]; e < head[u + 1]; e++) {
    const nd = d + w[e];
    const v = to[e];
    if (nd < dist[v]) { dist[v] = nd; push(nd, v); }
  }
}

// Tổng khoảng cách là duy nhất bất kể heap phá hoà kiểu gì, nên checksum ổn định.
// The distance sum is unique no matter how the heap breaks ties, so the checksum is stable.
let sum = 0n, reach = 0n;
for (let i = 0; i < n; i++) {
  if (dist[i] !== INF) { sum += BigInt(dist[i]); reach++; }
}

const ms = t.ms();
const c = new Checksum();
c.addU64(sum & 0xffffffffffffffffn);
c.addU64(reach);
report(ms, c.hex());
