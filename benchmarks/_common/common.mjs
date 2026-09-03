// Tiện ích dùng chung cho các bài test Node.js / Shared helpers for the Node.js benchmarks.

/** Đồng hồ đo phần việc thật. / Clock around the real work only. */
export class Timer {
  constructor() { this.t0 = process.hrtime.bigint(); }
  ms() { return Number(process.hrtime.bigint() - this.t0) / 1e6; }
}

/**
 * Checksum 32-bit, phải khớp với cả 4 ngôn ngữ kia.
 * 32-bit checksum, must match the other four languages.
 */
export class Checksum {
  constructor() { this.h = 2166136261; }
  add(v) {
    for (let i = 0; i < 4; i++) {
      this.h = (this.h ^ ((v >>> (i * 8)) & 0xff)) >>> 0;
      this.h = Math.imul(this.h, 16777619) >>> 0;
    }
  }
  addU64(v) {
    const b = BigInt(v);
    this.add(Number(b & 0xffffffffn) >>> 0);
    this.add(Number((b >> 32n) & 0xffffffffn) >>> 0);
  }
  value() { return this.h >>> 0; }
  hex() { return (this.h >>> 0).toString(16).padStart(8, '0'); }
}

/** Sinh số giả ngẫu nhiên xác định. / Deterministic PRNG. */
export class Lcg {
  constructor(seed = 42) { this.s = seed >>> 0; }
  next() {
    this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0;
    return this.s;
  }
}

/** Đọc tham số key=value. / Read a key=value parameter. */
export function param(key, fallback) {
  const prefix = key + '=';
  for (const a of process.argv.slice(2)) {
    if (a.startsWith(prefix)) {
      const n = Number(a.slice(prefix.length));
      if (Number.isFinite(n)) return n;
    }
  }
  return fallback;
}

/** Dòng duy nhất mà runner đọc. / The single line the runner parses. */
export function report(ms, checksum) {
  process.stdout.write(`{"ms": ${ms.toFixed(3)}, "checksum": "${checksum}"}\n`);
}
