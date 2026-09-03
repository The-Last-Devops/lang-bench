// Thu thập thông tin môi trường chạy test. Kết quả nào cũng phải kèm khối này,
// không có nó thì con số không tái lập và không kiểm chứng được.
// Collects the test environment. Every result must carry this block; without it
// the numbers are neither reproducible nor verifiable.
import os from 'node:os';
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

async function sh(cmd, args) {
  try {
    const { stdout } = await run(cmd, args, { timeout: 5000 });
    return stdout.trim();
  } catch {
    return null;
  }
}

function readFile(path) {
  try {
    return fs.readFileSync(path, 'utf8').trim();
  } catch {
    return null;
  }
}

/** Đang chạy trong container hay không. / Whether we are inside a container. */
export function inContainer() {
  if (fs.existsSync('/.dockerenv')) return true;
  const cgroup = readFile('/proc/1/cgroup') || '';
  return /docker|containerd|kubepods/.test(cgroup);
}

/**
 * Hạn mức CPU/RAM mà cgroup áp cho container. Rất quan trọng: bài `parallel`
 * chỉ thấy số lõi được cấp, không phải số lõi của máy thật.
 * The cgroup CPU/RAM limits on the container. This matters: the `parallel`
 * benchmark only sees the cores it was granted, not the host's real cores.
 */
function cgroupLimits() {
  const out = { cpuLimit: null, memLimitBytes: null };
  const cpuMax = readFile('/sys/fs/cgroup/cpu.max');
  if (cpuMax) {
    const [quota, period] = cpuMax.split(/\s+/);
    if (quota !== 'max') out.cpuLimit = Number(quota) / Number(period);
  }
  const memMax = readFile('/sys/fs/cgroup/memory.max');
  if (memMax && memMax !== 'max') out.memLimitBytes = Number(memMax);
  return out;
}

async function toolchains() {
  const first = (s) => (s ? s.split('\n')[0].trim() : null);
  const [cpp, rust, go, java, node, php, python, ruby, phpJit, rubyJit] = await Promise.all([
    sh('c++', ['--version']),
    sh('rustc', ['--version']),
    sh('go', ['version']),
    // javac in phiên bản ra stderr ở một số JDK, sh() đã gộp nên vẫn lấy được.
    // javac prints its version to stderr on some JDKs; sh() merges them so we still get it.
    sh('javac', ['-version']),
    Promise.resolve(`node ${process.version} · V8 ${process.versions.v8}`),
    sh('php', ['--version']),
    sh('python3', ['--version']),
    sh('ruby', ['--version']),
    sh('php', ['-d', 'opcache.enable_cli=1', '-d', 'opcache.jit=tracing', '-d', 'opcache.jit_buffer_size=128M',
       '-r', 'echo (opcache_get_status(false)["jit"]["enabled"] ?? false) ? "on" : "off";']),
    sh('ruby', ['--yjit', '-e', 'print RubyVM::YJIT.enabled? ? "on" : "off"']),
  ]);
  return {
    cpp: first(cpp),
    rust: first(rust),
    go: first(go),
    java: first(java),
    node,
    php: first(php),
    python: first(python),
    ruby: first(ruby),
    phpJit: phpJit ?? 'unknown',
    rubyJit: rubyJit ?? 'không có / unavailable',
  };
}

async function cpuDetail() {
  if (process.platform === 'darwin') {
    const [brand, perf, eff] = await Promise.all([
      sh('sysctl', ['-n', 'machdep.cpu.brand_string']),
      sh('sysctl', ['-n', 'hw.perflevel0.physicalcpu']),
      sh('sysctl', ['-n', 'hw.perflevel1.physicalcpu']),
    ]);
    return { model: brand, perfCores: perf ? Number(perf) : null, effCores: eff ? Number(eff) : null };
  }
  const cpuinfo = readFile('/proc/cpuinfo') || '';
  const model =
    cpuinfo.match(/^model name\s*:\s*(.+)$/m)?.[1] ||
    cpuinfo.match(/^Model\s*:\s*(.+)$/m)?.[1] ||
    os.cpus()[0]?.model ||
    null;
  return { model: model?.trim() ?? null, perfCores: null, effCores: null };
}

/** Trên macOS: chạy bằng pin sẽ bị hạ tần số, số liệu không dùng được. */
/** On macOS: running on battery downclocks the CPU and the numbers are unusable. */
async function power() {
  if (process.platform !== 'darwin') return null;
  const out = await sh('pmset', ['-g', 'batt']);
  if (!out) return null;
  return /AC Power/.test(out) ? 'ac' : 'battery';
}

export async function collectHostInfo() {
  const container = inContainer();
  const limits = container ? cgroupLimits() : { cpuLimit: null, memLimitBytes: null };
  const [cpu, tools, pwr, osVersion] = await Promise.all([
    cpuDetail(),
    toolchains(),
    power(),
    process.platform === 'darwin' ? sh('sw_vers', ['-productVersion']) : Promise.resolve(null),
  ]);

  const usableCores = limits.cpuLimit ? Math.floor(limits.cpuLimit) : os.cpus().length;

  return {
    env: container ? 'docker' : 'native',
    arch: process.arch,
    platform: process.platform,
    osRelease: osVersion ? `macOS ${osVersion}` : (readFile('/etc/os-release')?.match(/PRETTY_NAME="(.+)"/)?.[1] ?? os.type()),
    kernel: `${os.type()} ${os.release()}`,
    cpuModel: cpu.model,
    cpuCount: os.cpus().length,
    perfCores: cpu.perfCores,
    effCores: cpu.effCores,
    usableCores,
    cpuLimit: limits.cpuLimit,
    memTotalBytes: os.totalmem(),
    memLimitBytes: limits.memLimitBytes,
    power: pwr,
    loadAvg: os.loadavg().map((v) => Math.round(v * 100) / 100),
    toolchains: tools,
    collectedAt: new Date().toISOString(),
  };
}

/** Khoá môi trường: hai lần chạy chỉ so được với nhau khi khoá này trùng. */
/** Environment key: two runs are only comparable when this key matches. */
export function envKey(host) {
  return [host.env, host.arch, host.cpuModel, host.usableCores, host.osRelease]
    .map((v) => String(v ?? '?'))
    .join(' | ');
}
