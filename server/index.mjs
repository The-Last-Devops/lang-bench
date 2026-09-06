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
    const opts = { ...parseArgs([]), ...options };
    const payload = await runSuite(opts, broadcast);
    state.lastRunId = payload.runId;
  } catch (err) {
    broadcast({ type: 'error', message: err.message });
  } finally {
    state.running = false;
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
