// utf8 — dựng một chuỗi nhiều ngôn ngữ rồi duyệt qua từng ký tự Unicode.
//
// JS là ngôn ngữ chịu thiệt rõ nhất ở bài này, và đó chính là điều đáng đo: chuỗi trong JS
// là UTF-16, nên mọi ký tự ngoài BMP — toàn bộ dải ký hiệu — chiếm HAI đơn vị và phải ghép
// lại thành một điểm mã. `for..of` làm việc ghép đó, còn `s[i]` thì không.
//
// utf8 — build a multilingual string, then walk it character by character.
//
// JS is the language this costs the most, which is exactly what makes it worth measuring: a
// JS string is UTF-16, so every character outside the BMP — the whole symbol range — occupies
// TWO units that have to be recombined into one code point. `for..of` does that; `s[i]` does not.
import { Timer, Checksum, Lcg, param, report } from '../_common/common.mjs';

const n = param('n', 400000);

// Bốn dải: ASCII 1 byte, Latin 2 byte, CJK 3 byte, ký hiệu 4 byte (khi mã hoá UTF-8).
// Four ranges: ASCII at 1 byte, Latin at 2, CJK at 3, symbols at 4 once encoded as UTF-8.
const rng = new Lcg(2024);
const cps = new Uint32Array(n);
let bytes = 0;
for (let i = 0; i < n; i++) {
  const r = rng.next();
  let cp;
  switch (r & 3) {
    case 0: cp = 0x20 + ((r >>> 8) % 95); break;
    case 1: cp = 0xC0 + ((r >>> 8) % 64); break;
    case 2: cp = 0x4E00 + ((r >>> 8) % 0x5000); break;
    default: cp = 0x1F300 + ((r >>> 8) % 0x300); break;
  }
  cps[i] = cp;
  bytes += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
}

// Ghép theo từng mảng rồi nối lại: fromCodePoint có giới hạn số đối số, và nối chuỗi từng
// ký tự một cho 400k lần sẽ đo nhầm sang phần dựng chuỗi thay vì phần duyệt.
// Built in chunks and joined: fromCodePoint has an argument limit, and appending one
// character at a time 400k times would measure string building instead of the walk.
const parts = [];
for (let i = 0; i < n; i += 4096) {
  parts.push(String.fromCodePoint(...cps.subarray(i, Math.min(i + 4096, n))));
}
const s = parts.join('');

const t = new Timer();

// for..of duyệt theo ĐIỂM MÃ, ghép đúng các cặp thay thế của UTF-16.
// for..of iterates by CODE POINT, correctly recombining UTF-16 surrogate pairs.
let sum = 0, wide = 0, idx = 0;
for (const ch of s) {
  const cp = ch.codePointAt(0);
  idx += 1;
  sum = (sum + Math.imul(idx, cp)) >>> 0;
  if (cp > 0x7F) wide += 1;
}

const ms = t.ms();
const c = new Checksum();
c.add(sum);
c.add(wide);
c.add(idx);
c.addU64(BigInt(bytes));
report(ms, c.hex());
