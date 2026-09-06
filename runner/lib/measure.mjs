// Chạy một chương trình benchmark rồi đo: thời gian trong chương trình, thời gian
// tiến trình (kể cả khởi động), và bộ nhớ đỉnh. Dùng /usr/bin/time vì Node không
// cho đọc rusage của tiến trình con.
// Runs one benchmark program and measures: the in-program time, the process wall time
// (startup included), and peak memory. Uses /usr/bin/time because Node cannot read a
// child process's rusage.
import { spawn } from 'node:child_process';

let timeMode = null; // 'gnu' | 'bsd' | 'none'

async function probeTimeMode() {
  if (timeMode) return timeMode;
  for (const [mode, flag] of [['gnu', '-v'], ['bsd', '-l']]) {
    const ok = await new Promise((resolve) => {
      const p = spawn('/usr/bin/time', [flag, 'true'], { stdio: 'ignore' });
      p.on('error', () => resolve(false));
      p.on('close', (code) => resolve(code === 0));
    });
    if (ok) {
      timeMode = mode;
      return mode;
    }
  }
  timeMode = 'none';
  return timeMode;
}

function parseRssBytes(stderr, mode) {
  if (mode === 'gnu') {
    const m = stderr.match(/Maximum resident set size \(kbytes\):\s*(\d+)/);
    return m ? Number(m[1]) * 1024 : null;
  }
  if (mode === 'bsd') {
    const m = stderr.match(/(\d+)\s+maximum resident set size/);
    return m ? Number(m[1]) : null;
  }
  return null;
}

/**
 * Một lần đo. Trả về { wallMs, internalMs, rssBytes, checksum } hoặc { error }.
 * A single measurement. Returns { wallMs, internalMs, rssBytes, checksum } or { error }.
 */
/**
 * Thêm `signal` để hủy được lượt chạy đang dở.
 *
 * Phải giết đúng tiến trình con: một phép đo có thể mất hàng chục giây, chờ nó xong rồi
 * mới dừng thì nút Stop coi như không có tác dụng. `signal` đã abort sẵn thì không spawn
 * gì cả — nếu không, mỗi lần bấm Stop vẫn còn một phép đo lọt qua.
 *
 * `signal` makes a run cancellable.
 *
 * The child has to be killed outright: a single measurement can take tens of seconds, and
 * waiting for it to finish would make Stop feel like it does nothing. An already-aborted
 * signal spawns nothing at all — otherwise one more measurement slips through every press.
 */
export async function measureOnce({ cmd, args, cwd, env, timeoutMs = 300000, signal }) {
  if (signal?.aborted) return { error: 'đã dừng / stopped', aborted: true };
  const mode = await probeTimeMode();
  const useTime = mode !== 'none';
  const spawnCmd = useTime ? '/usr/bin/time' : cmd;
  const spawnArgs = useTime ? [mode === 'gnu' ? '-v' : '-l', cmd, ...args] : args;

  const started = process.hrtime.bigint();
  return new Promise((resolve) => {
    const child = spawn(spawnCmd, spawnArgs, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    let aborted = false;
    const onAbort = () => {
      aborted = true;
      child.kill('SIGKILL');
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (err) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve({ error: `không chạy được: ${err.message}` });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      if (aborted) return resolve({ error: 'đã dừng / stopped', aborted: true });
      const wallMs = Number(process.hrtime.bigint() - started) / 1e6;

      if (timedOut) return resolve({ error: `quá thời gian (${timeoutMs} ms)` });
      if (code !== 0) {
        // Bỏ các dòng do /usr/bin/time in ra, nếu không lỗi thật sẽ bị chúng che mất.
        // Drop the lines /usr/bin/time prints, otherwise they hide the real error.
        const own = stderr
          .split('\n')
          .filter((l) => l.trim())
          .filter((l) => !/^\s*\d+[\d.:]*\s+[a-z]/i.test(l) && !/^\s*(real|user|sys)\s/.test(l) && !/^\t/.test(l) && !/^Command being timed|^Exit status|^Percent of CPU|^Elapsed \(wall/.test(l));
        const msg = (own.length ? own : stderr.split('\n').filter((l) => l.trim())).slice(0, 4).join(' | ');
        return resolve({ error: `thoát với mã ${code}: ${msg.slice(0, 400)}` });
      }

      const line = stdout.split('\n').find((l) => l.trim().startsWith('{'));
      if (!line) return resolve({ error: `không tìm thấy dòng kết quả JSON trong stdout` });

      let parsed;
      try {
        parsed = JSON.parse(line);
      } catch (e) {
        return resolve({ error: `dòng kết quả không phải JSON hợp lệ: ${line.slice(0, 120)}` });
      }
      if (typeof parsed.ms !== 'number' || typeof parsed.checksum !== 'string') {
        return resolve({ error: `dòng kết quả thiếu ms hoặc checksum` });
      }

      resolve({
        wallMs,
        internalMs: parsed.ms,
        rssBytes: parseRssBytes(stderr, mode),
        checksum: parsed.checksum,
      });
    });
  });
}

/** Trung vị — dùng thay cho trung bình để một lần chạy lỗi nhịp không kéo lệch. */
/** Median — used instead of the mean so one hiccup cannot drag the number. */
export function median(values) {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function stddev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}
