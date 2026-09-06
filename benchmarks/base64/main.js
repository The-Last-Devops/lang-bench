// base64 — mã hoá rồi giải mã một khối dữ liệu. Toàn thao tác dịch bit và tra bảng trên
// mảng byte: không dùng Buffer.toString('base64'), vì bốn ngôn ngữ phải chạy đúng cùng
// một đoạn mã thì so sánh mới có nghĩa. Xem main.cpp để biết chi tiết.
// base64 — encode a block of data, then decode it back. Pure bit-shifting and table
// lookups over byte arrays: Buffer.toString('base64') is deliberately not used, because
// the comparison only means something if all four languages run the same code.
import { Timer, Checksum, Lcg, param, report } from '../_common/common.mjs';

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const EQ = 61; // '='

const size = param('size', 3000000);

const src = new Uint8Array(size);
const rng = new Lcg(7);
for (let i = 0; i < size; i++) src[i] = rng.next() >>> 24;

const alpha = new Uint8Array(64);
for (let i = 0; i < 64; i++) alpha[i] = ALPHA.charCodeAt(i);
const rev = new Int8Array(256).fill(-1);
for (let i = 0; i < 64; i++) rev[alpha[i]] = i;

const t = new Timer();

const encLen = Math.floor((size + 2) / 3) * 4;
const enc = new Uint8Array(encLen);
let o = 0;
for (let i = 0; i < size; i += 3) {
  let v = src[i] << 16;
  if (i + 1 < size) v |= src[i + 1] << 8;
  if (i + 2 < size) v |= src[i + 2];
  enc[o++] = alpha[(v >> 18) & 63];
  enc[o++] = alpha[(v >> 12) & 63];
  enc[o++] = i + 1 < size ? alpha[(v >> 6) & 63] : EQ;
  enc[o++] = i + 2 < size ? alpha[v & 63] : EQ;
}

const dec = new Uint8Array(size);
let d = 0;
for (let i = 0; i < encLen; i += 4) {
  const c0 = rev[enc[i]], c1 = rev[enc[i + 1]];
  const c2 = enc[i + 2] === EQ ? -1 : rev[enc[i + 2]];
  const c3 = enc[i + 3] === EQ ? -1 : rev[enc[i + 3]];
  let v = (c0 << 18) | (c1 << 12);
  if (c2 >= 0) v |= c2 << 6;
  if (c3 >= 0) v |= c3;
  if (d < size) dec[d++] = (v >> 16) & 0xff;
  if (c2 >= 0 && d < size) dec[d++] = (v >> 8) & 0xff;
  if (c3 >= 0 && d < size) dec[d++] = v & 0xff;
}

// Cộng có trọng số vị trí, tràn vòng 32-bit: bắt được cả sai giá trị lẫn sai thứ tự.
// Position-weighted sums with 32-bit wraparound: they catch wrong bytes and wrong order alike.
let encSum = 0, decSum = 0;
for (let i = 0; i < encLen; i++) encSum = (encSum + (i + 1) * enc[i]) >>> 0;
for (let i = 0; i < d; i++) decSum = (decSum + (i + 1) * dec[i]) >>> 0;

const ms = t.ms();
const c = new Checksum();
c.add(encSum);
c.add(decSum);
c.addU64(BigInt(encLen));
report(ms, c.hex());
