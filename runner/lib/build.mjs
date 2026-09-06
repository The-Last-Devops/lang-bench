// Biên dịch từng ngôn ngữ. Thiếu toolchain nào thì ngôn ngữ đó bị đánh dấu
// "không có" và bỏ qua — không làm sập cả lượt chạy.
// Builds each language. A missing toolchain marks that language "unavailable"
// and skips it, rather than failing the whole run.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export function runCommand(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => resolve({ code: -1, out, err: e.message }));
    child.on('close', (code) => resolve({ code, out, err }));
  });
}

async function has(cmd, args = ['--version']) {
  const { code } = await runCommand(cmd, args);
  return code === 0;
}

/** Cờ tối ưu CPU: -mcpu=native trên ARM, -march=native trên x86. */
/** CPU tuning flag: -mcpu=native on ARM, -march=native on x86. */
async function nativeFlag(root) {
  const probe = path.join(root, 'build', 'probe.cpp');
  fs.mkdirSync(path.dirname(probe), { recursive: true });
  fs.writeFileSync(probe, 'int main(){return 0;}\n');
  for (const flag of process.arch === 'arm64' ? ['-mcpu=native', ''] : ['-march=native', '']) {
    const args = ['-O3'];
    if (flag) args.push(flag);
    args.push(probe, '-o', path.join(root, 'build', 'probe.out'));
    const { code } = await runCommand('c++', args, { cwd: root });
    if (code === 0) return flag;
  }
  return '';
}

/**
 * Trả về map langId -> { available, run(benchId, params) -> {cmd,args}, buildLog }
 * Returns a map langId -> { available, run(benchId, params) -> {cmd,args}, buildLog }
 */
export async function buildAll({ root, registry, onLog, only }) {
  const bench = path.join(root, 'benchmarks');
  const buildDir = path.join(root, 'build');
  const log = (lang, msg) => onLog?.({ lang, message: msg });
  const result = {};

  // Chỉ build đúng những ngôn ngữ được yêu cầu. Trước đây hàm này build sạch mọi
  // toolchain tìm thấy trên máy, kể cả khi --langs chỉ xin bốn cái — nên javac,
  // php, ruby vẫn chạy và kéo dài giai đoạn build vô ích.
  // Build only the languages that were actually asked for. This used to build every
  // toolchain present on the machine even when --langs asked for four, so javac, php
  // and ruby still ran and padded out the build phase for nothing.
  const want = (id) => !only || only.has(id);
  const skip = (id) => { result[id] = { available: false, reason: 'không được yêu cầu', failures: {} }; };

  const ids = registry.benchmarks.map((b) => b.id);

  // ---- C++ ----
  if (!want('cpp')) skip('cpp');
  else if (await has('c++')) {
    const flag = await nativeFlag(root);
    fs.mkdirSync(path.join(buildDir, 'cpp'), { recursive: true });
    log('cpp', `c++ -O3 ${flag} -std=c++20`);
    const failures = {};
    for (const id of ids) {
      const args = ['-std=c++20', '-O3'];
      if (flag) args.push(flag);
      args.push('-I', path.join(bench, '_common'));
      args.push(path.join(bench, id, 'main.cpp'));
      args.push('-o', path.join(buildDir, 'cpp', id));
      if (id === 'crypto-hash') args.push('-lcrypto');
      if (id === 'parallel') args.push('-pthread');
      const r = await runCommand('c++', args, { cwd: root });
      if (r.code !== 0) {
        failures[id] = r.err.split('\n').filter((l) => l.trim()).slice(0, 3).join(' | ');
        log('cpp', `LỖI ${id}: ${failures[id].slice(0, 200)}`);
      }
    }
    result.cpp = {
      available: true,
      failures,
      run: (id, params) => ({ cmd: path.join(buildDir, 'cpp', id), args: params }),
    };
  } else {
    result.cpp = { available: false, reason: 'không tìm thấy c++', failures: {} };
    log('cpp', 'bỏ qua — không tìm thấy c++');
  }

  // ---- Rust ----
  if (!want('rust')) skip('rust');
  else if (await has('cargo')) {
    log('rust', 'cargo build --release (lto=fat, codegen-units=1)');
    const r = await runCommand('cargo', ['build', '--release', '--manifest-path', path.join(bench, 'Cargo.toml')], { cwd: bench });
    const targetDir = process.env.CARGO_TARGET_DIR || path.join(bench, 'target');
    if (r.code !== 0) {
      log('rust', `LỖI build: ${r.err.split('\n').slice(-6).join(' | ').slice(0, 400)}`);
      result.rust = { available: false, reason: 'cargo build thất bại', failures: {}, buildLog: r.err };
    } else {
      result.rust = {
        available: true,
        failures: {},
        run: (id, params) => ({ cmd: path.join(targetDir, 'release', id), args: params }),
      };
    }
  } else {
    result.rust = { available: false, reason: 'không tìm thấy cargo', failures: {} };
    log('rust', 'bỏ qua — không tìm thấy cargo');
  }

  // ---- Go ----
  if (!want('go')) skip('go');
  else if (await has('go', ['version'])) {
    fs.mkdirSync(path.join(buildDir, 'go'), { recursive: true });
    log('go', 'go build -ldflags="-s -w"');
    const failures = {};
    for (const id of ids) {
      // Nguồn Go nằm ở <bài>/go/ vì Go từ chối thư mục có lẫn file .cpp.
      // Go sources live in <bench>/go/ because Go refuses a directory containing .cpp files.
      const r = await runCommand('go', ['build', '-ldflags=-s -w', '-o', path.join(buildDir, 'go', id), './' + id + '/go'], { cwd: bench });
      if (r.code !== 0) {
        failures[id] = r.err.split('\n').filter((l) => l.trim()).slice(0, 3).join(' | ');
        log('go', `LỖI ${id}: ${failures[id].slice(0, 200)}`);
      }
    }
    result.go = {
      available: true,
      failures,
      run: (id, params) => ({ cmd: path.join(buildDir, 'go', id), args: params }),
    };
  } else {
    result.go = { available: false, reason: 'không tìm thấy go', failures: {} };
    log('go', 'bỏ qua — không tìm thấy go');
  }

  // ---- Node.js ----
  if (!want('node')) skip('node');
  else {
    result.node = {
      available: true,
      failures: {},
      run: (id, params) => ({ cmd: process.execPath, args: [path.join(bench, id, 'main.js'), ...params] }),
    };
    log('node', 'không cần build');
  }

  // ---- PHP ----
  if (!want('php')) skip('php');
  else if (await has('php', ['--version'])) {
    result.php = {
      available: true,
      failures: {},
      // memory_limit=-1: mặc định 128 MB của PHP không đủ cho bài sort/hashmap.
      // JIT bật tường minh để native khớp với Docker; nếu không có opcache thì cờ này vô hại.
      // memory_limit=-1: PHP's 128 MB default is not enough for the sort/hashmap benchmarks.
      // JIT is turned on explicitly so native matches Docker; harmless if opcache is absent.
      run: (id, params) => ({
        cmd: 'php',
        args: [
          '-d', 'memory_limit=-1',
          '-d', 'opcache.enable_cli=1',
          '-d', 'opcache.jit=tracing',
          '-d', 'opcache.jit_buffer_size=128M',
          path.join(bench, id, 'main.php'),
          ...params,
        ],
      }),
    };
    log('php', 'không cần build');
  } else {
    result.php = { available: false, reason: 'không tìm thấy php', failures: {} };
    log('php', 'bỏ qua — không tìm thấy php');
  }

  // ---- Java ----
  if (!want('java')) skip('java');
  else if (await has('javac', ['-version'])) {
    fs.mkdirSync(path.join(buildDir, 'java'), { recursive: true });
    log('java', 'javac (mỗi bài compile vào thư mục riêng)');
    const failures = {};
    const shared = [path.join(bench, '_common', 'Common.java'), path.join(bench, '_common', 'Json.java')];
    for (const id of ids) {
      const out = path.join(buildDir, 'java', id);
      fs.mkdirSync(out, { recursive: true });
      const r = await runCommand('javac', ['-d', out, path.join(bench, id, 'Main.java'), ...shared], { cwd: root });
      if (r.code !== 0) {
        failures[id] = r.err.split('\n').filter((l) => l.trim()).slice(0, 3).join(' | ');
        log('java', `LỖI ${id}: ${failures[id].slice(0, 200)}`);
      }
    }
    result.java = {
      available: true,
      failures,
      run: (id, params) => ({ cmd: 'java', args: ['-cp', path.join(buildDir, 'java', id), 'Main', ...params] }),
    };
  } else {
    result.java = { available: false, reason: 'không tìm thấy javac', failures: {} };
    log('java', 'bỏ qua — không tìm thấy javac');
  }

  // ---- Python ----
  const python = !want('python') ? null
    : (await has('python3', ['--version'])) ? 'python3'
    : (await has('python', ['--version'])) ? 'python' : null;
  if (!want('python')) skip('python');
  else if (python) {
    result.python = {
      available: true,
      failures: {},
      run: (id, params) => ({ cmd: python, args: [path.join(bench, id, 'main.py'), ...params] }),
    };
    log('python', 'không cần build');
  } else {
    result.python = { available: false, reason: 'không tìm thấy python3', failures: {} };
    log('python', 'bỏ qua — không tìm thấy python3');
  }

  // ---- Ruby ----
  if (!want('ruby')) skip('ruby');
  else if (await has('ruby', ['--version'])) {
    // YJIT chỉ có ở bản Ruby được build kèm nó. Phải dò, vì truyền --yjit cho bản
    // không hỗ trợ sẽ làm chương trình chết ngay.
    // YJIT only exists in Ruby builds that shipped it. Probe for it: passing --yjit to a
    // build without it kills the process outright.
    const yjit = (await runCommand('ruby', ['--yjit', '-e', ''])).code === 0;
    const rubyFlags = yjit ? ['--yjit'] : [];
    result.ruby = {
      available: true,
      failures: {},
      run: (id, params) => ({ cmd: 'ruby', args: [...rubyFlags, path.join(bench, id, 'main.rb'), ...params] }),
    };
    log('ruby', yjit ? 'không cần build · YJIT bật' : 'không cần build · KHÔNG có YJIT ở bản Ruby này');
  } else {
    result.ruby = { available: false, reason: 'không tìm thấy ruby', failures: {} };
    log('ruby', 'bỏ qua — không tìm thấy ruby');
  }

  return result;
}
