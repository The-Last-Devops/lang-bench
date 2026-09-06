// Server nhỏ, không phụ thuộc gói ngoài: phục vụ dashboard, đọc kết quả đã lưu,
// và chạy benchmark theo yêu cầu rồi đẩy tiến trình về trình duyệt qua SSE.
// A tiny dependency-free server: serves the dashboard, reads saved results, and
// runs the suite on demand while streaming progress to the browser over SSE.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectHostInfo, envKey } from '../runner/lib/host.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web');
const RESULTS = path.join(ROOT, 'results');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

// Trạng thái của lượt chạy hiện tại. Chỉ cho phép một lượt tại một thời điểm:
// hai lượt song song sẽ tranh CPU và làm sai cả hai.
// State of the current run. Only one at a time: two concurrent runs would fight
// for CPU and corrupt both sets of numbers.
const state = {
  running: false,
  // Cần giữ để /api/stop hủy được lượt đang chạy. / Kept so /api/stop can cancel a run.
  ctl: null,
  events: [],
  clients: new Set(),
  startedAt: null,
  lastRunId: null,
};

function broadcast(event) {
  state.events.push(event);
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of state.clients) {
    try {
      res.write(payload);
    } catch {
      state.clients.delete(res);
    }
  }
}

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store',
  });
  res.end(text);
}

function listRuns() {
  if (!fs.existsSync(RESULTS)) return [];
  return fs
    .readdirSync(RESULTS)
    .filter((f) => /^run-\d{4}\.json$/.test(f))
    .map((f) => {
      try {
        const p = JSON.parse(fs.readFileSync(path.join(RESULTS, f), 'utf8'));
        return {
          runId: p.runId,
          startedAt: p.startedAt,
          finishedAt: p.finishedAt,
          durationMs: p.durationMs,
          envKey: p.envKey,
          env: p.host?.env,
          cpuModel: p.host?.cpuModel,
          usableCores: p.host?.usableCores,
          scores: p.scores?.overall ?? {},
          benchmarkCount: p.registry?.benchmarks?.length ?? 0,
          languages: (p.registry?.languages ?? []).map((l) => l.id),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.runId.localeCompare(a.runId));
}

function serveStatic(req, res, urlPath) {
  const rel = urlPath === '/' ? '/index.html' : urlPath;
  const target = path.join(WEB, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!target.startsWith(WEB) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('không tìm thấy / not found');
    return;
  }
  const body = fs.readFileSync(target);
  res.writeHead(200, {
    'content-type': MIME[path.extname(target)] ?? 'application/octet-stream',
    'content-length': body.length,
    'cache-control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

async function startRun(options) {
  state.running = true;
  state.events = [];
  state.startedAt = new Date().toISOString();
  broadcast({ type: 'runStarted', at: state.startedAt, options });

  try {
    const { runSuite, parseArgs } = await import('../runner/run.mjs');
    state.ctl = new AbortController();
    const opts = { ...parseArgs([]), ...options, signal: state.ctl.signal };
    const payload = await runSuite(opts, broadcast);
    state.lastRunId = payload.runId;
  } catch (err) {
    // Bấm Stop thì fetch trong runner ném AbortError — đó là kết quả ĐÚNG của việc dừng,
    // không phải hỏng hóc. Báo nó thành lỗi đỏ khiến người dùng tưởng mình vừa làm hỏng gì.
    // Pressing Stop makes the runner's fetch throw AbortError: that is the correct outcome
    // of stopping, not a failure. Reporting it in red reads as though something broke.
    if (!state.ctl?.signal.aborted) broadcast({ type: 'error', message: err.message });
  } finally {
    const stopped = state.ctl?.signal.aborted ?? false;
    state.ctl = null;
    state.running = false;
    if (stopped) broadcast({ type: 'warn', vi: 'đã dừng theo yêu cầu', en: 'stopped on request' });
    broadcast({ type: 'runFinished', runId: state.lastRunId });
  }
}

export function startServer({ port = 8080, host = '0.0.0.0' } = {}) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;

    try {
      if (p === '/api/registry') {
        return sendJson(res, 200, JSON.parse(fs.readFileSync(path.join(ROOT, 'benchmarks', 'registry.json'), 'utf8')));
      }

      // Danh sách ngôn ngữ đang thật sự chạy được, lấy từ LB_AGENTS — tức là từ
      // docker-compose. Màn hình không viết cứng ngôn ngữ nào nữa, nên thêm một service là
      // nó tự hiện thêm một hàng, kể cả phiên bản thứ hai của cùng một ngôn ngữ.
      // The languages actually available, taken from LB_AGENTS — that is, from
      // docker-compose. The screen hard-codes none of them, so adding a service adds a row,
      // second versions of the same language included.
      if (p === '/api/languages') {
        const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'benchmarks', 'registry.json'), 'utf8'));
        const { parseAgents } = await import('../runner/lib/agents.mjs');
        const agents = parseAgents();
        if (!agents.length) return sendJson(res, 200, { languages: registry.languages });
        // Màu cho ngôn ngữ registry chưa biết: dẫn xuất từ ngôn ngữ gốc nếu tên có tiền tố
        // trùng (node20 → màu của node), còn không thì dùng màu trung tính.
        // A colour for a language the registry has not seen: derived from the base language
        // when the name shares its prefix (node20 takes node's), else a neutral tone.
        // Phiên bản hỏi thẳng từng agent. /api/host chỉ biết toolchain của container SERVER,
        // nên nó không thể biết node26 hay node24 là bản nào — mà đó lại đúng là thứ cần hiện.
        // Versions come from each agent. /api/host only knows the SERVER container's
        // toolchains, so it cannot say which build node26 or node24 is — which is the very
        // thing that needs showing.
        const info = await Promise.all(agents.map(async (a) => {
          try {
            const r = await fetch(a.url + '/info', { signal: AbortSignal.timeout(2500) });
            return r.ok ? await r.json() : null;
          } catch { return null; }
        }));
        const languages = agents.map((a, i) => {
          const exact = registry.languages.find((l) => l.id === a.id);
          const base = registry.languages.find((l) => a.id.startsWith(l.id));
          return {
            id: a.id,
            name: exact?.name ?? a.id,
            color: exact?.color ?? base?.color ?? '#9AA6B6',
            version: info[i]?.version ?? null,
            cores: info[i]?.cores ?? null,
          };
        });
        return sendJson(res, 200, { languages });
      }

      if (p === '/api/reference') {
        return sendJson(res, 200, JSON.parse(fs.readFileSync(path.join(ROOT, 'benchmarks', 'reference.json'), 'utf8')));
      }

      if (p === '/api/host') {
        const info = await collectHostInfo();
        return sendJson(res, 200, { host: info, envKey: envKey(info) });
      }

      if (p === '/api/status') {
        return sendJson(res, 200, { running: state.running, startedAt: state.startedAt, lastRunId: state.lastRunId });
      }

      if (p === '/api/runs') {
        return sendJson(res, 200, listRuns());
      }

      const runMatch = p.match(/^\/api\/runs\/(run-\d{4})$/);
      if (runMatch) {
        const file = path.join(RESULTS, `${runMatch[1]}.json`);
        if (!fs.existsSync(file)) return sendJson(res, 404, { error: 'không có lượt chạy này' });
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        return fs.createReadStream(file).pipe(res);
      }

      if (p === '/api/events') {
        res.writeHead(200, {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-store',
          connection: 'keep-alive',
          'x-accel-buffering': 'no',
        });
        res.write(': đã kết nối / connected\n\n');
        // Phát lại các sự kiện của lượt đang chạy để client vào muộn không mất gì.
        // Replay the current run's events so a late-joining client misses nothing.
        for (const e of state.events) res.write(`data: ${JSON.stringify(e)}\n\n`);
        state.clients.add(res);
        const ping = setInterval(() => {
          try {
            res.write(': ping\n\n');
          } catch {
            clearInterval(ping);
          }
        }, 15000);
        req.on('close', () => {
          clearInterval(ping);
          state.clients.delete(res);
        });
        return;
      }

      // Hủy lượt đang chạy. Giết luôn tiến trình con đang đo — một phép đo có thể mất
      // hàng chục giây, đợi nó xong thì nút Stop coi như vô dụng.
      // Cancel the current run, killing the measuring child outright: a measurement can
      // take tens of seconds, and waiting it out would make Stop useless.
      if (p === '/api/stop' && req.method === 'POST') {
        if (!state.running || !state.ctl) return sendJson(res, 409, { error: 'không có lượt chạy nào' });
        state.ctl.abort();
        return sendJson(res, 202, { stopping: true });
      }

      // Xoá nhật ký phát lại. Không có đường này thì Clear chỉ dọn được trình duyệt: server
      // vẫn giữ toàn bộ sự kiện của lượt vừa chạy và phát lại cho mọi trang mới, nên F5 là
      // bảng điểm hiện lại y nguyên.
      // Drop the replay log. Without this, Clear only tidies the browser: the server still
      // holds the finished run's events and replays them to every new page, so a reload
      // brings the whole board back.
      if (p === '/api/clear' && req.method === 'POST') {
        if (state.running) return sendJson(res, 409, { error: 'đang chạy, không xoá được' });
        state.events = [];
        state.lastRunId = null;
        return sendJson(res, 200, { cleared: true });
      }

      if (p === '/api/run' && req.method === 'POST') {
        if (state.running) return sendJson(res, 409, { error: 'đang có một lượt chạy — chỉ chạy một lượt tại một thời điểm' });
        const body = await readBody(req);
        const options = {
          only: Array.isArray(body.only) && body.only.length ? body.only : null,
          langs: Array.isArray(body.langs) && body.langs.length ? body.langs : null,
          runs: Number.isFinite(body.runs) && body.runs > 0 ? Math.min(body.runs, 100) : null,
          warmup: Number.isFinite(body.warmup) && body.warmup >= 0 ? Math.min(body.warmup, 20) : 2,
          quick: !!body.quick,
          timeoutMs: 300000,
        };
        startRun(options);
        return sendJson(res, 202, { started: true, options });
      }

      if (p.startsWith('/api/')) return sendJson(res, 404, { error: 'không có API này' });

      return serveStatic(req, res, p);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  });

  server.listen(port, host, () => {
    console.log(`\ndashboard: http://localhost:${port}`);
  });
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const portArg = process.argv.find((a) => a.startsWith('--port='));
  startServer({ port: portArg ? Number(portArg.slice(7)) : 8080 });
}
