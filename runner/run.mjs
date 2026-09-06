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
import { parseAgents, waitReady, buildOn, measureOn } from './lib/agents.mjs';
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

/**
 * Chọn cách thực thi: qua agent nếu LB_AGENTS có, còn không thì chạy tại chỗ.
 *
 * Cả hai trả về cùng một giao diện, nên vòng lặp đo bên dưới không biết và không cần biết
 * mình đang đo qua mạng hay đo ngay trong tiến trình này. Đường chạy tại chỗ được giữ lại
 * để `node runner/run.mjs` trên máy thật vẫn hoạt động như trước.
 *
 * Pick an executor: agents when LB_AGENTS is set, otherwise everything in this process.
 *
 * Both expose the same interface, so the measuring loop below neither knows nor needs to
 * know whether it is measuring across a network or in-process. The local path stays so
 * `node runner/run.mjs` on a real machine still works as before.
 */
async function makeExecutor({ registry, benchmarks, languages, opts, onEvent }) {
  const agents = parseAgents().filter((a) => !opts.langs || opts.langs.includes(a.id));
  const log = (lang, message) => onEvent({ type: 'log', lang, message });

  if (agents.length) {
    // Ngôn ngữ có trong LB_AGENTS mà registry chưa biết — ví dụ node20 — vẫn phải chạy
    // được, nếu không thì thêm một phiên bản lại phải sửa registry.
    // A language in LB_AGENTS that the registry has never heard of — node20, say — must
    // still run, or adding a version would mean editing the registry every time.
    const meta = (id) => registry.languages.find((l) => l.id === id)
      ?? { id, name: id, color: '#9AA6B6' };

    const live = [];
    for (const a of agents) {
      const info = await waitReady(a);
      if (!info) {
        onEvent({ type: 'unavailable', language: a.id, reason: 'agent không phản hồi' });
        continue;
      }
      log(a.id, info.version);
      live.push({ ...a, info });
    }
    if (!live.length) throw new Error('không có agent nào phản hồi');

    const ids = benchmarks.map((b) => b.id);
    const failures = {};
    for (const a of live) {
      const r = await buildOn(a, ids);
      if (r.fatal) { failures[a.id] = Object.fromEntries(ids.map((i) => [i, r.fatal])); log(a.id, `LỖI build: ${r.log ?? r.fatal}`); continue; }
      failures[a.id] = r.failures ?? {};
      if (r.note) log(a.id, r.note);
      if (r.reused) log(a.id, `${r.reused}/${ids.length} đã có sẵn, bỏ qua / cached`);
      for (const [bid, msg] of Object.entries(r.failures ?? {})) log(a.id, `LỖI ${bid}: ${String(msg).slice(0, 200)}`);
    }

    const byId = new Map(live.map((a) => [a.id, a]));
    return {
      kind: 'agents',
      languages: live.map((a) => meta(a.id)),
      failures,
      // Số nhân lấy từ chính agent: hạn mức cgroup của container ngôn ngữ mới là con số
      // mà `parallel` chạy dưới, không phải hạn mức của container server.
      // Cores come from the agent: the language container's own cgroup limit is what
      // `parallel` runs under, not the server container's.
      cores: live[0].info.cores,
      versions: Object.fromEntries(live.map((a) => [a.id, a.info.version])),
      warmup: (langId, b, params, n) =>
        measureOn(byId.get(langId), { benchmark: b.id, params, warmup: n, reps: 0, metric: b.metric ?? 'internal', timeoutMs: opts.timeoutMs }, opts.signal),
      measureOne: async (langId, b, params) => {
        const r = await measureOn(byId.get(langId), { benchmark: b.id, params, warmup: 0, reps: 1, metric: b.metric ?? 'internal', timeoutMs: opts.timeoutMs }, opts.signal);
        if (!r.ok) return { error: r.error };
        return { ms: r.samples[0], wallMs: r.wall[0], rssBytes: r.rssBytes, checksum: r.checksum };
      },
    };
  }

  // ── chạy tại chỗ, như trước khi tách container ──
  const toolchains = await buildAll({
    root: ROOT,
    registry: { ...registry, benchmarks },
    onLog: (e) => onEvent({ type: 'log', ...e }),
    only: new Set(languages.map((l) => l.id)),
  });
  const live = languages.filter((l) => toolchains[l.id]?.available);
  for (const l of languages) {
    if (!toolchains[l.id]?.available) {
      onEvent({ type: 'unavailable', language: l.id, reason: toolchains[l.id]?.reason ?? 'không rõ' });
    }
  }
  const host = await collectHostInfo();
  const env = { LB_TMPDIR: process.env.LB_TMPDIR || (host.env === 'docker' ? '/tmp' : path.join(ROOT, 'build')) };
  const cmdFor = (langId, b, params) => toolchains[langId].run(b.id, params);
  return {
    kind: 'local',
    languages: live,
    failures: Object.fromEntries(live.map((l) => [l.id, toolchains[l.id].failures ?? {}])),
    cores: host.usableCores,
    versions: {},
    warmup: async (langId, b, params, n) => {
      const { cmd, args } = cmdFor(langId, b, params);
      for (let i = 0; i < n; i++) {
        const r = await measureOnce({ cmd, args, cwd: ROOT, env, timeoutMs: opts.timeoutMs, signal: opts.signal });
        if (r.error) return { ok: false, error: r.error };
      }
      return { ok: true };
    },
    measureOne: async (langId, b, params) => {
      const { cmd, args } = cmdFor(langId, b, params);
      const r = await measureOnce({ cmd, args, cwd: ROOT, env, timeoutMs: opts.timeoutMs, signal: opts.signal });
      if (r.error) return { error: r.error };
      return { ms: b.metric === 'wall' ? r.wallMs : r.internalMs, wallMs: r.wallMs, rssBytes: r.rssBytes, checksum: r.checksum };
    },
  };
}

export async function runSuite(opts, onEvent = () => {}) {
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'benchmarks', 'registry.json'), 'utf8'));

  let benchmarks = registry.benchmarks;
  if (opts.only) benchmarks = benchmarks.filter((b) => opts.only.includes(b.id));
  // KHÔNG lọc danh sách ngôn ngữ theo registry khi đang chạy bằng agent: registry chỉ biết
  // 8 ngôn ngữ gốc, còn agent có thể là `node26` — lọc ở đây thì mọi phiên bản đều bị loại
  // sạch và lượt chạy chết ngay với "không còn ngôn ngữ nào". Việc lọc thuộc về executor,
  // nơi biết danh sách agent thật.
  // Do NOT filter the language list against the registry when running on agents: the
  // registry knows only the eight base languages while an agent may be `node26`, so
  // filtering here wiped every version out and killed the run outright. Filtering belongs to
  // the executor, which knows the real agent list.
  let languages = registry.languages;
  if (opts.langs && !process.env.LB_AGENTS) {
    languages = languages.filter((l) => opts.langs.includes(l.id));
    if (languages.length === 0) throw new Error('không còn ngôn ngữ nào sau khi lọc --langs');
  }
  if (benchmarks.length === 0) throw new Error('không còn bài test nào sau khi lọc --only');

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
  const exec = await makeExecutor({ registry, benchmarks, languages, opts, onEvent });
  const active = exec.languages;
  if (active.length === 0) throw new Error('không có ngôn ngữ nào build được');
  const failedFor = (langId, bid) => exec.failures[langId]?.[bid];

  const total = benchmarks.reduce((acc, b) => acc + active.filter((l) => !failedFor(l.id, b.id)).length, 0);
  let done = 0;
  onEvent({ type: 'phase', phase: 'run', total });

  const results = {};

  for (const [bi, b] of benchmarks.entries()) {
    if (opts.signal?.aborted) break;
    const reps = runsFor(b);
    results[b.id] = { params: b.params ?? {}, runs: reps, warmup, checksums: {} };

    // Số luồng lấy từ hạn mức của container NGÔN NGỮ, không phải của container server.
    // Thread count comes from the LANGUAGE container's limit, not the server's.
    const params = paramArgs({ ...b.params, ...(b.id === 'parallel' ? { threads: exec.cores } : {}) });

    // Một chỗ giữ trạng thái cho mỗi ngôn ngữ, vì các lần đo của nó không còn liền nhau.
    // One slot of state per language, since its repetitions are no longer contiguous.
    const slots = active.map((lang, li) => ({
      lang, li,
      failed: failedFor(lang.id, b.id) ? `build thất bại: ${failedFor(lang.id, b.id)}` : null,
      samples: [], wall: [], rssMax: null, checksum: null,
    }));

    const prog = (slot, run, phase) => onEvent({
      type: 'progress',
      done, total,
      benchmark: b.id, benchmarkIndex: bi + 1, benchmarkCount: benchmarks.length,
      language: slot.lang.id, languageIndex: slot.li + 1, languageCount: active.length,
      run, runs: reps, phase,
    });

    // Warmup cho mọi ngôn ngữ trước, để không ngôn ngữ nào bước vào vòng đo đầu tiên ở
    // trạng thái "lạnh" hơn ngôn ngữ khác.
    // Warm every language up first, so none enters the first measured round colder than
    // the others.
    for (const slot of slots) {
      if (opts.signal?.aborted) break;
      if (slot.failed) continue;
      prog(slot, 0, 'warmup');
      if (warmup > 0) {
        const r = await exec.warmup(slot.lang.id, b, params, warmup);
        if (r && r.ok === false) slot.failed = r.error;
      }
    }

    // XEN KẼ: mỗi vòng đo một lượt qua tất cả ngôn ngữ, rồi mới sang vòng sau.
    //
    // Trước đây chạy hết mọi lần đo của một ngôn ngữ rồi mới sang ngôn ngữ kế tiếp, nên
    // median của mỗi ngôn ngữ nằm gọn trong một khoảng thời gian riêng. Máy nóng dần, hay
    // một tiến trình khác chen vào giữa lượt chạy, là ngôn ngữ đo sau chịu điều kiện khác
    // ngôn ngữ đo trước — và sai lệch đó đi thẳng vào kết quả.
    // Xen kẽ thì mỗi ngôn ngữ lấy mẫu rải khắp toàn bộ lượt chạy, nên nhiễu môi trường
    // rơi lên cả bốn gần như bằng nhau thay vì dồn vào một.
    //
    // INTERLEAVED: one repetition of every language per round, then the next round.
    //
    // Every repetition of a language used to run back to back before moving on, so each
    // language's median came from its own private window of time. A machine warming up, or
    // another process arriving mid-run, gave the languages measured later different
    // conditions from those measured first — and that bias landed straight in the result.
    // Interleaving spreads each language's samples across the whole run, so environmental
    // noise falls on all four roughly equally instead of concentrating on one.
    for (let i = 0; i < reps; i++) {
      if (opts.signal?.aborted) break;
      for (const slot of slots) {
        if (opts.signal?.aborted) break;
        if (slot.failed) continue;
        prog(slot, i + 1, 'measure');
        const r = await exec.measureOne(slot.lang.id, b, params);
        if (r.error) { slot.failed = r.error; continue; }
        const ms = r.ms;
        slot.samples.push(ms);
        slot.wall.push(r.wallMs);
        if (r.rssBytes != null) slot.rssMax = Math.max(slot.rssMax ?? 0, r.rssBytes);
        if (slot.checksum === null) slot.checksum = r.checksum;
        // Với agent, mỗi vòng là một lời gọi riêng, nên phép kiểm này phải nằm ở runner —
        // agent chỉ thấy được một vòng của chính nó.
        // With agents each round is its own call, so this check has to live in the runner:
        // an agent only ever sees the one round it was asked for.
        else if (slot.checksum !== r.checksum) { slot.failed = `checksum không ổn định giữa các lần chạy (${slot.checksum} rồi ${r.checksum})`; continue; }
        onEvent({
          type: 'sample',
          benchmark: b.id, language: slot.lang.id, run: i + 1, runs: reps,
          ms, rssBytes: r.rssBytes, checksum: r.checksum,
        });
      }
    }

    // Chốt số cho từng ngôn ngữ sau khi mọi vòng đã xong.
    // Settle each language once every round is finished.
    for (const slot of slots) {
      const stats = slot.failed || !slot.samples.length
        ? { ok: false, error: slot.failed ?? 'không có mẫu nào / no samples' }
        : {
            ok: true,
            median: median(slot.samples),
            min: Math.min(...slot.samples),
            max: Math.max(...slot.samples),
            stddev: stddev(slot.samples),
            samples: slot.samples,
            wallMedian: median(slot.wall),
            startupOverheadMs: Math.max(0, median(slot.wall) - median(slot.samples)),
            rssBytes: slot.rssMax,
            checksum: slot.checksum,
          };
      results[b.id][slot.lang.id] = stats;
      if (stats.ok) results[b.id].checksums[slot.lang.id] = slot.checksum;
      done += 1;
      onEvent({ type: 'measurement', benchmark: b.id, language: slot.lang.id, stats, done, total });
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
