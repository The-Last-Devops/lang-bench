// Agent đo hiệu năng, chạy trong container của một ngôn ngữ.
//
// Lý do tồn tại: nếu runner gọi vào container cho TỪNG phép đo thì chi phí gọi
// (`docker run` ~300–800ms, `docker exec` ~50–120ms) sẽ lấn hết tín hiệu — `fib` chỉ
// 3ms, và `startup` đo chính thời gian khởi động tiến trình. Agent nhận một yêu cầu cho
// cả loạt phép đo rồi tự spawn, tự bấm đồng hồ ngay tại đây, nên chi phí điều phối nằm
// hoàn toàn ngoài con số trả về.
//
// The measurement agent, running inside one language's container.
//
// Why it exists: calling into the container for EVERY measurement would swamp the signal —
// `docker run` costs 300-800ms and `docker exec` 50-120ms, while `fib` takes 3ms and
// `startup` measures process startup itself. The agent takes one request for a whole batch
// and spawns and times locally, so orchestration cost stays outside the numbers it returns.
import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import { measureOnce } from '../lib/measure.mjs';
import { SPEC, KIND, LANG, BENCH, BUILD } from './spec.mjs';

const PORT = Number(process.env.LB_AGENT_PORT || 8100);

if (!SPEC) {
  console.error(`LB_KIND không hợp lệ: ${KIND}`);
  process.exit(1);
}

let built = null; // kết quả build gần nhất / the last build result

const json = (res, code, body) => {
  const b = JSON.stringify(body);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(b) });
  res.end(b);
};

const body = (req) => new Promise((resolve) => {
  let d = '';
  req.on('data', (c) => (d += c));
  req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } });
});

// Hạn mức CPU đọc từ cgroup của CHÍNH container này. Mỗi ngôn ngữ phải thấy đúng cùng một
// hạn mức, nếu không `parallel` sẽ mở số luồng khác nhau và phép so sánh mất nghĩa.
// The CPU limit read from THIS container's own cgroup. Every language must see the same
// limit, or `parallel` opens a different number of threads and the comparison is void.
function cpuLimit() {
  try {
    const [quota, period] = fs.readFileSync('/sys/fs/cgroup/cpu.max', 'utf8').trim().split(/\s+/);
    if (quota !== 'max') return Number(quota) / Number(period);
  } catch { /* không phải cgroup v2 / not cgroup v2 */ }
  return os.cpus().length;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://a');
  try {
    if (url.pathname === '/info') {
      return json(res, 200, {
        lang: LANG, kind: KIND,
        version: await SPEC.version(),
        arch: process.arch,
        cores: Math.floor(cpuLimit()),
        cpuLimit: cpuLimit(),
        agent: process.version,
      });
    }

    if (url.pathname === '/build' && req.method === 'POST') {
      const { ids = [] } = await body(req);
      built = await SPEC.build(ids);
      return json(res, 200, built);
    }

    // Cả loạt phép đo trong một yêu cầu: warmup rồi N lần đo, đồng hồ bấm tại đây.
    // A whole batch per request: warmup then N measured runs, timed right here.
    if (url.pathname === '/measure' && req.method === 'POST') {
      const { benchmark, params = [], warmup = 0, reps = 1, metric = 'internal', timeoutMs = 300000 } = await body(req);
      if (!benchmark) return json(res, 400, { error: 'thiếu benchmark' });
      if (built?.failures?.[benchmark]) return json(res, 200, { ok: false, error: `build thất bại: ${built.failures[benchmark]}` });
      if (built?.fatal) return json(res, 200, { ok: false, error: built.fatal });

      const { cmd, args } = SPEC.cmd(benchmark, params);
      const env = { LB_TMPDIR: '/tmp' };

      for (let w = 0; w < warmup; w++) {
        const r = await measureOnce({ cmd, args, cwd: BENCH, env, timeoutMs });
        if (r.error) return json(res, 200, { ok: false, error: r.error });
      }

      const samples = [], wall = [];
      let rssMax = null, checksum = null;
      for (let i = 0; i < reps; i++) {
        const r = await measureOnce({ cmd, args, cwd: BENCH, env, timeoutMs });
        if (r.error) return json(res, 200, { ok: false, error: r.error });
        samples.push(metric === 'wall' ? r.wallMs : r.internalMs);
        wall.push(r.wallMs);
        if (r.rssBytes != null) rssMax = Math.max(rssMax ?? 0, r.rssBytes);
        if (checksum === null) checksum = r.checksum;
        else if (checksum !== r.checksum) {
          return json(res, 200, { ok: false, error: `checksum không ổn định giữa các lần chạy (${checksum} rồi ${r.checksum})` });
        }
      }
      return json(res, 200, { ok: true, samples, wall, rssBytes: rssMax, checksum });
    }

    return json(res, 404, { error: 'không có route này' });
  } catch (err) {
    return json(res, 500, { error: err.message });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`agent ${LANG} (kind ${KIND}) · cổng ${PORT} · build dir ${BUILD}`);
});
