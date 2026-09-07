// Cách build và chạy một ngôn ngữ. Một nguồn duy nhất: mọi agent đọc cùng file này, chỉ
// khác nhau ở biến LB_LANG, nên không có chỗ nào để hai container hiểu khác nhau.
//
// Trước đây toàn bộ phần này nằm trong runner/lib/build.mjs dưới dạng một hàm build hết
// mọi ngôn ngữ. Khi mỗi ngôn ngữ có container riêng thì hàm đó không dùng được nữa: mỗi
// container chỉ có toolchain của chính nó.
//
// How to build and run one language. A single source of truth: every agent reads this same
// file and differs only by LB_LANG, so there is nowhere for two containers to disagree.
//
// This used to live inside runner/lib/build.mjs as one function that built every language.
// With a container per language that function no longer applies: each container has only
// its own toolchain.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

export const BENCH = '/bench/benchmarks';
export const BUILD = '/build';

export function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', (e) => resolve({ code: -1, out, err: String(e.message) }));
    p.on('close', (code) => resolve({ code, out, err }));
  });
}

const firstLine = (s) => (s || '').split('\n').find((l) => l.trim()) ?? '';
const short = (s) => (s || '').split('\n').filter((l) => l.trim()).slice(0, 3).join(' | ');

// Binary đã mới hơn nguồn thì khỏi dịch lại. Nguồn gồm cả _common, vì sửa một header là
// mọi bài phải dịch lại.
// Skip the compile when the binary is newer than its sources — _common included, since
// editing a header invalidates every benchmark.
function fresh(out, srcs) {
  let t;
  try { t = fs.statSync(out).mtimeMs; } catch { return false; }
  for (const s of srcs) {
    let st;
    try { st = fs.statSync(s); } catch { return false; }
    if (st.mtimeMs > t) return false;
    if (st.isDirectory()) {
      for (const f of fs.readdirSync(s)) {
        try { if (fs.statSync(path.join(s, f)).mtimeMs > t) return false; } catch { return false; }
      }
    }
  }
  return true;
}

// Dò cờ native một lần. Trình biên dịch trên arm64 dùng -mcpu, trên x86 dùng -march.
// Probe the native flag once: arm64 compilers take -mcpu, x86 ones -march.
let nativeFlag = null;
async function cppNativeFlag() {
  if (nativeFlag !== null) return nativeFlag;
  fs.mkdirSync(BUILD, { recursive: true });
  const probe = path.join(BUILD, 'probe.cpp');
  fs.writeFileSync(probe, 'int main(){return 0;}\n');
  for (const flag of process.arch === 'arm64' ? ['-mcpu=native', ''] : ['-march=native', '']) {
    const args = ['-O3', ...(flag ? [flag] : []), probe, '-o', path.join(BUILD, 'probe.out')];
    if ((await run('c++', args)).code === 0) { nativeFlag = flag; return flag; }
  }
  nativeFlag = '';
  return '';
}

export const SPECS = {
  cpp: {
    version: async () => firstLine((await run('c++', ['--version'])).out),
    async build(ids) {
      const flag = await cppNativeFlag();
      const outDir = path.join(BUILD, 'cpp');
      fs.mkdirSync(outDir, { recursive: true });
      const failures = {};
      let reused = 0;
      for (const id of ids) {
        const out = path.join(outDir, id);
        const src = path.join(BENCH, id, 'main.cpp');
        if (fresh(out, [src, path.join(BENCH, '_common')])) { reused += 1; continue; }
        const args = ['-std=c++20', '-O3', ...(flag ? [flag] : []),
          '-I', path.join(BENCH, '_common'), src, '-o', out];
        if (id === 'parallel') args.push('-pthread');
        const r = await run('c++', args);
        if (r.code !== 0) failures[id] = short(r.err);
      }
      return { failures, reused, note: `c++ -O3 ${flag} -std=c++20` };
    },
    cmd: (id, params) => ({ cmd: path.join(BUILD, 'cpp', id), args: params }),
  },

  rust: {
    version: async () => firstLine((await run('rustc', ['--version'])).out),
    async build() {
      // Cargo build một lượt cho mọi binary, và tự lo phần cache.
      // One cargo build covers every binary, and cargo handles its own caching.
      const r = await run('cargo', ['build', '--release', '--manifest-path', path.join(BENCH, 'Cargo.toml')], { cwd: BENCH });
      if (r.code !== 0) return { fatal: 'cargo build thất bại', log: short(r.err) };
      return { failures: {}, reused: 0, note: 'cargo build --release (lto=fat, codegen-units=1)' };
    },
    cmd: (id, params) => ({
      cmd: path.join(process.env.CARGO_TARGET_DIR || path.join(BENCH, 'target'), 'release', id),
      args: params,
    }),
  },

  go: {
    version: async () => firstLine((await run('go', ['version'])).out),
    async build(ids) {
      const outDir = path.join(BUILD, 'go');
      fs.mkdirSync(outDir, { recursive: true });
      const failures = {};
      for (const id of ids) {
        // Nguồn Go nằm ở <bài>/go/ vì Go từ chối thư mục có lẫn file .cpp.
        // Go sources live in <bench>/go/ because Go refuses a directory holding .cpp files.
        const r = await run('go', ['build', '-ldflags=-s -w', '-o', path.join(outDir, id), './' + id + '/go'], { cwd: BENCH });
        if (r.code !== 0) failures[id] = short(r.err);
      }
      return { failures, reused: 0, note: 'go build -ldflags="-s -w"' };
    },
    cmd: (id, params) => ({ cmd: path.join(BUILD, 'go', id), args: params }),
  },

  node: {
    version: async () => `node ${process.version}`,
    build: async () => ({ failures: {}, reused: 0, note: 'không cần build / no build step' }),
    cmd: (id, params) => ({ cmd: process.execPath, args: [path.join(BENCH, id, 'main.js'), ...params] }),
  },

  php: {
    version: async () => firstLine((await run('php', ['--version'])).out),
    build: async () => ({ failures: {}, reused: 0, note: 'không cần build / no build step' }),
    // memory_limit=-1: mặc định 128 MB không đủ cho bài sort và hashmap.
    // JIT bật tường minh, vì PHP tắt JIT theo mặc định và để nguyên thì đây thành phép đo
    // của trình thông dịch chứ không phải của PHP như người ta chạy trong sản xuất.
    // memory_limit=-1: the 128 MB default is not enough for sort or hashmap.
    // JIT is enabled explicitly: PHP ships it off, and leaving it off would measure the
    // interpreter rather than PHP as it actually runs in production.
    cmd: (id, params) => ({
      cmd: 'php',
      args: [
        '-d', 'memory_limit=-1',
        '-d', 'opcache.enable_cli=1',
        '-d', 'opcache.jit=tracing',
        '-d', 'opcache.jit_buffer_size=128M',
        path.join(BENCH, id, 'main.php'),
        ...params,
      ],
    }),
  },

  pascal: {
    version: async () => firstLine((await run('fpc', ['-iW'])).out).trim(),
    async build(ids) {
      const outDir = path.join(BUILD, 'pascal');
      // -FU: thư mục cho .ppu/.o trung gian. Không chỉ định thì fpc rải chúng cạnh mã
      // nguồn, tức là ghi vào thư mục benchmarks đang mount vào MỌI container.
      // -FU: where the intermediate .ppu/.o go. Left unset, fpc drops them next to the
      // sources — writing into the benchmarks directory mounted into EVERY container.
      const unitDir = path.join(outDir, 'units');
      fs.mkdirSync(unitDir, { recursive: true });
      const common = path.join(BENCH, '_common');
      const failures = {};
      let reused = 0;
      for (const id of ids) {
        const out = path.join(outDir, id);
        const src = path.join(BENCH, id, 'main.pas');
        if (fresh(out, [src, common])) { reused += 1; continue; }
        const args = ['-O3', '-Mobjfpc', '-Sh', '-vw', `-Fu${common}`, `-FU${unitDir}`,
          `-o${out}`, src];
        const r = await run('fpc', args, { cwd: BENCH });
        // fpc báo lỗi ra STDOUT chứ không phải stderr, khác mọi trình biên dịch khác ở đây.
        // fpc reports errors on STDOUT, not stderr, unlike every other compiler here.
        if (r.code !== 0) failures[id] = short(r.out || r.err);
      }
      return { failures, reused, note: 'fpc -O3 -Mobjfpc' };
    },
    cmd: (id, params) => ({ cmd: path.join(BUILD, 'pascal', id), args: params }),
  },

  python: {
    version: async () => firstLine((await run('python3', ['--version'])).out),
    build: async () => ({ failures: {}, reused: 0, note: 'không cần build / no build step' }),
    cmd: (id, params) => ({ cmd: 'python3', args: [path.join(BENCH, id, 'main.py'), ...params] }),
  },
};

// LB_KIND nói dùng đặc tả nào; LB_LANG là danh tính hiển thị. Hai thứ tách nhau để chạy
// nhiều phiên bản của cùng một ngôn ngữ: node20 và node22 đều là kind 'node'.
// LB_KIND picks the spec, LB_LANG is the display identity. They are separate so several
// versions of one language can run side by side: node20 and node22 are both kind 'node'.
export const KIND = process.env.LB_KIND || process.env.LB_LANG || 'node';
export const LANG = process.env.LB_LANG || KIND;
export const SPEC = SPECS[KIND];
