#!/usr/bin/env node
// lang-bench runner — build rồi chạy TUẦN TỰ từng ngôn ngữ, từng bài, từng lần.
// Không bao giờ chạy song song: hai tiến trình tranh CPU là số liệu sai.
//
// lang-bench runner — builds, then runs SEQUENTIALLY: one language, one benchmark,
// one repetition at a time. Never in parallel: two processes fighting for CPU
// produce wrong numbers.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectHostInfo, envKey } from './lib/host.mjs';
import { measureOnce, median, stddev } from './lib/measure.mjs';
import { buildAll } from './lib/build.mjs';
import { computeScores } from './lib/score.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function parseArgs(argv) {
  const opts = {
    warmup: 2, runs: null, only: null, langs: null,
    serve: false, port: 8080, quick: false, timeoutMs: 300000,
  };
  for (const a of argv) {
    if (a === '--serve') opts.serve = true;
    else if (a === '--quick') opts.quick = true;
    else if (a.startsWith('--runs=')) opts.runs = Number(a.slice(7));
    else if (a.startsWith('--warmup=')) opts.warmup = Number(a.slice(9));
    else if (a.startsWith('--only=')) opts.only = a.slice(7).split(',').map((s) => s.trim()).filter(Boolean);
    else if (a.startsWith('--langs=')) opts.langs = a.slice(8).split(',').map((s) => s.trim()).filter(Boolean);
    else if (a.startsWith('--port=')) opts.port = Number(a.slice(7));
    else if (a.startsWith('--timeout=')) opts.timeoutMs = Number(a.slice(10)) * 1000;
  }
  return opts;
}

function nextRunId(resultsDir) {
  fs.mkdirSync(resultsDir, { recursive: true });
  const used = fs
    .readdirSync(resultsDir)
    .map((f) => f.match(/^run-(\d{4})\.json$/))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  const next = (used.length ? Math.max(...used) : 0) + 1;
  return 'run-' + String(next).padStart(4, '0');
}

function paramArgs(params) {
  return Object.entries(params ?? {}).map(([k, v]) => `${k}=${v}`);
}

/**
 * Chạy cả bộ. onEvent nhận từng bước để server đẩy ra trình duyệt.
 * Runs the whole suite. onEvent receives each step so the server can stream it.
 */
/**
 * Bài nào chưa có mốc trong reference.json thì ghi mốc suy ra từ lượt chạy này.
 *
 * Mốc là median nhanh nhất trong các ngôn ngữ — đúng cách những mốc gốc được tạo ra. Nếu
 * không ghi lại, mỗi lượt chạy sẽ tự suy ra một mốc khác nhau và điểm giữa các lượt không
 * còn so sánh được. Chỉ ghi bài CHƯA có mốc: mốc đã có là cố định, ghi đè sẽ làm mọi kết
 * quả cũ mất giá trị so sánh.
 *
 * Fill in a reference for any benchmark that reaches the end of a run without one.
 *
 * The mark is the fastest median across the languages — how the original marks were made.
 * Without writing it back, every run would derive its own and scores would stop being
 * comparable between runs. Only benchmarks that have no mark are written: an existing mark
 * is fixed, and overwriting it would invalidate every earlier result.
 */
function fillMissingReferences(results, benchmarks, onEvent) {
  const refPath = path.join(ROOT, 'benchmarks', 'reference.json');
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(refPath, 'utf8'));
  } catch {
    return; // không có file thì thôi, đây là việc phụ / no file, this is a side errand
  }
  doc.refMs ??= {};
  const added = [];
  for (const b of benchmarks) {
    if (doc.refMs[b.id]) continue;
    const medians = Object.values(results[b.id] ?? {})
      .filter((r) => r && r.ok && Number.isFinite(r.median))
      .map((r) => r.median);
    if (!medians.length) continue;
    doc.refMs[b.id] = Number(Math.min(...medians).toFixed(2));
    added.push(b.id);
  }
  if (!added.length) return;
  try {
    fs.writeFileSync(refPath, JSON.stringify(doc, null, 2) + '\n');
    onEvent({
      type: 'warn',
      vi: `đã ghi mốc mới cho: ${added.join(', ')}`,
      en: `wrote new reference marks for: ${added.join(', ')}`,
    });
  } catch { /* chỉ đọc thì bỏ qua / read-only mount, skip */ }
}

export async function runSuite(opts, onEvent = () => {}) {
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'benchmarks', 'registry.json'), 'utf8'));

  let benchmarks = registry.benchmarks;
  if (opts.only) benchmarks = benchmarks.filter((b) => opts.only.includes(b.id));
  let languages = registry.languages;
  if (opts.langs) languages = languages.filter((l) => opts.langs.includes(l.id));
  if (benchmarks.length === 0) throw new Error('không còn bài test nào sau khi lọc --only');
  if (languages.length === 0) throw new Error('không còn ngôn ngữ nào sau khi lọc --langs');

  const runsFor = (b) => {
    if (opts.runs) return opts.runs;
    if (opts.quick) return Math.max(1, Math.round(b.runs / 3));
    return b.runs;
  };
  const warmup = opts.quick ? Math.min(1, opts.warmup) : opts.warmup;

  const startedAt = new Date();
  const host = await collectHostInfo();
  onEvent({ type: 'host', host, envKey: envKey(host) });

  if (host.env === 'native' && host.power === 'battery') {
    onEvent({ type: 'warn', vi: 'Máy đang chạy pin — CPU sẽ bị hạ tần số, số liệu không dùng để so sánh được.', en: 'Running on battery — the CPU will downclock and these numbers are not comparable.' });
  }

  onEvent({ type: 'phase', phase: 'build' });
  const toolchains = await buildAll({
    root: ROOT,
    registry: { ...registry, benchmarks },
    onLog: (e) => onEvent({ type: 'log', ...e }),
    only: new Set(languages.map((l) => l.id)),
  });

  const active = languages.filter((l) => toolchains[l.id]?.available);
  for (const l of languages) {
    if (!toolchains[l.id]?.available) {
      onEvent({ type: 'unavailable', language: l.id, reason: toolchains[l.id]?.reason ?? 'không rõ' });
    }
  }
  if (active.length === 0) throw new Error('không có ngôn ngữ nào build được');

  const total = benchmarks.reduce((acc, b) => acc + active.filter((l) => !toolchains[l.id].failures[b.id]).length, 0);
  let done = 0;
  onEvent({ type: 'phase', phase: 'run', total });

  const results = {};

  for (const [bi, b] of benchmarks.entries()) {
    if (opts.signal?.aborted) break;
    const reps = runsFor(b);
    results[b.id] = { params: b.params ?? {}, runs: reps, warmup, checksums: {} };

    for (const [li, lang] of active.entries()) {
      if (opts.signal?.aborted) break;
      const tc = toolchains[lang.id];

      if (tc.failures[b.id]) {
        results[b.id][lang.id] = { ok: false, error: `build thất bại: ${tc.failures[b.id]}` };
        done += 1;
        onEvent({ type: 'measurement', benchmark: b.id, language: lang.id, stats: results[b.id][lang.id], done, total });
        continue;
      }

      onEvent({
        type: 'progress',
        done, total,
        benchmark: b.id, benchmarkIndex: bi + 1, benchmarkCount: benchmarks.length,
        language: lang.id, languageIndex: li + 1, languageCount: active.length,
        run: 0, runs: reps, phase: 'warmup',
      });

      const { cmd, args } = tc.run(b.id, paramArgs({ ...b.params, ...(b.id === 'parallel' ? { threads: host.usableCores } : {}) }));
      const env = { LB_TMPDIR: process.env.LB_TMPDIR || (host.env === 'docker' ? '/tmp' : path.join(ROOT, 'build')) };

      let failed = null;
      for (let w = 0; w < warmup; w++) {
        const r = await measureOnce({ cmd, args, cwd: ROOT, env, timeoutMs: opts.timeoutMs, signal: opts.signal });
        if (r.error) { failed = r.error; break; }
      }

      const samples = [];
      const wall = [];
      let rssMax = null;
      let checksum = null;

      if (!failed) {
        for (let i = 0; i < reps; i++) {
          onEvent({
            type: 'progress',
            done, total,
            benchmark: b.id, benchmarkIndex: bi + 1, benchmarkCount: benchmarks.length,
            language: lang.id, languageIndex: li + 1, languageCount: active.length,
            run: i + 1, runs: reps, phase: 'measure',
          });
          const r = await measureOnce({ cmd, args, cwd: ROOT, env, timeoutMs: opts.timeoutMs, signal: opts.signal });
          if (r.error) { failed = r.error; break; }
          samples.push(b.metric === 'wall' ? r.wallMs : r.internalMs);
          wall.push(r.wallMs);
          if (r.rssBytes != null) rssMax = Math.max(rssMax ?? 0, r.rssBytes);
          if (checksum === null) checksum = r.checksum;
          else if (checksum !== r.checksum) { failed = `checksum không ổn định giữa các lần chạy (${checksum} rồi ${r.checksum})`; break; }
          onEvent({
            type: 'sample',
            benchmark: b.id, language: lang.id, run: i + 1, runs: reps,
            ms: samples[samples.length - 1], rssBytes: r.rssBytes, checksum: r.checksum,
          });
        }
      }

      const stats = failed
        ? { ok: false, error: failed }
        : {
            ok: true,
            median: median(samples),
            min: Math.min(...samples),
            max: Math.max(...samples),
            stddev: stddev(samples),
            samples,
            wallMedian: median(wall),
            startupOverheadMs: Math.max(0, median(wall) - median(samples)),
            rssBytes: rssMax,
            checksum,
          };
      results[b.id][lang.id] = stats;
      if (!failed) results[b.id].checksums[lang.id] = checksum;

      done += 1;
      onEvent({ type: 'measurement', benchmark: b.id, language: lang.id, stats, done, total });
    }

    const seen = Object.values(results[b.id].checksums);
    results[b.id].checksumMatch = seen.length > 1 ? seen.every((v) => v === seen[0]) : null;
    onEvent({
      type: 'benchmarkDone',
      benchmark: b.id,
      checksumMatch: results[b.id].checksumMatch,
      checksums: results[b.id].checksums,
    });
  }

  const scores = computeScores({ results, languages: active, benchmarks });
  const finishedAt = new Date();

  const resultsDir = path.join(ROOT, 'results');
  const runId = nextRunId(resultsDir);
  const payload = {
    schema: 1,
    runId,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt - startedAt,
    host,
    envKey: envKey(host),
    config: { warmup, runsOverride: opts.runs, quick: opts.quick, only: opts.only, langs: opts.langs },
    registry: { groups: registry.groups, languages: active, benchmarks },
    results,
    scores,
  };
  const outPath = path.join(resultsDir, `${runId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 1));
  if (!opts.signal?.aborted) fillMissingReferences(results, benchmarks, onEvent);

  onEvent({ type: 'phase', phase: 'done', runId, path: outPath, scores });
  return payload;
}

// ---------------- CLI ----------------

function formatMs(ms) {
  if (ms == null) return '—';
  if (ms < 10) return ms.toFixed(2) + ' ms';
  if (ms < 1000) return ms.toFixed(0) + ' ms';
  return (ms / 1000).toFixed(2) + ' s';
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  let lastProgress = '';

  const payload = await runSuite(opts, (e) => {
    switch (e.type) {
      case 'host':
        console.log(`môi trường : ${e.host.env}  ·  ${e.host.cpuModel}  ·  ${e.host.usableCores} lõi dùng được  ·  ${e.host.osRelease}`);
        console.log(`PHP JIT    : ${e.host.toolchains.phpJit}   ·   Ruby YJIT : ${e.host.toolchains.rubyJit}`);
        break;
      case 'warn':
        console.log(`\n!! ${e.vi}\n`);
        break;
      case 'phase':
        if (e.phase === 'build') console.log('\n── build ──');
        if (e.phase === 'run') console.log(`\n── chạy ${e.total} phép đo, tuần tự ──`);
        break;
      case 'log':
        console.log(`  ${e.lang.padEnd(5)} ${e.message}`);
        break;
      case 'unavailable':
        console.log(`  ${e.language.padEnd(5)} KHÔNG CÓ — ${e.reason}`);
        break;
      case 'progress': {
        const line = `  [${String(e.done).padStart(2)}/${e.total}] ${e.benchmark.padEnd(13)} ${e.language.padEnd(5)} ${e.phase === 'warmup' ? 'warmup' : `lần ${e.run}/${e.runs}`}`;
        if (process.stdout.isTTY) {
          process.stdout.write('\r' + line.padEnd(72));
          lastProgress = line;
        }
        break;
      }
      case 'measurement': {
        if (process.stdout.isTTY && lastProgress) process.stdout.write('\r' + ' '.repeat(74) + '\r');
        const s = e.stats;
        if (s.ok) {
          const rss = s.rssBytes ? `${(s.rssBytes / 1048576).toFixed(0)} MB` : '—';
          console.log(`  [${String(e.done).padStart(2)}/${e.total}] ${e.benchmark.padEnd(13)} ${e.language.padEnd(5)} ${formatMs(s.median).padStart(9)}  σ ${formatMs(s.stddev).padStart(8)}  rss ${rss.padStart(7)}  ${s.checksum}`);
        } else {
          console.log(`  [--/${e.total}] ${e.benchmark.padEnd(13)} ${e.language.padEnd(5)} LỖI: ${s.error}`);
        }
        break;
      }
      case 'benchmarkDone':
        if (e.checksumMatch === false) {
          console.log(`      !! checksum KHÔNG khớp cho ${e.benchmark}: ${JSON.stringify(e.checksums)}`);
          console.log(`         → bài này bị loại khỏi điểm tổng hợp.`);
        }
        break;
      case 'phase_done':
        break;
    }
  });

  console.log(`\n── điểm tổng hợp (càng cao càng nhanh, 100 = nhanh nhất mọi bài) ──`);
  const entries = Object.entries(payload.scores.overall)
    .filter(([, v]) => v != null)
    .sort((a, b) => b[1] - a[1]);
  for (const [langId, score] of entries) {
    const name = payload.registry.languages.find((l) => l.id === langId)?.name ?? langId;
    const bar = '█'.repeat(Math.round(score / 2.5));
    console.log(`  ${name.padEnd(8)} ${score.toFixed(1).padStart(5)}  ${bar}`);
  }
  console.log(`\n  tính trên ${payload.scores.countedBenchmarks.length}/${payload.registry.benchmarks.length} bài có checksum khớp`);
  console.log(`  đã lưu: results/${payload.runId}.json`);

  if (opts.serve) {
    const { startServer } = await import('../server/index.mjs');
    startServer({ port: opts.port });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error('\nlỗi:', err.message);
    process.exit(1);
  });
}
