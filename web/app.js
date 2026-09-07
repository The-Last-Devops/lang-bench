/* lang-bench dashboard — Vue 3, không build step, không phụ thuộc gói ngoài.
   lang-bench dashboard — Vue 3, no build step, no external dependencies. */
const { createApp, ref, reactive, computed, onMounted, watch, nextTick } = Vue;

/* ── chuỗi hai ngôn ngữ / bilingual strings ─────────────────────────────── */
const STR = {
  vi: {
    running: 'đang chạy',
    checksumOk: 'checksum khớp', checksumBad: 'bài checksum KHÔNG khớp',
    benchmarks: 'Bài test', benchWord: 'bài', groupWord: 'nhóm',
    selectAll: 'Chọn tất cả', clearAll: 'Bỏ chọn',
    languages: 'Ngôn ngữ', config: 'Cấu hình đo',
    runsKnob: 'Số lần chạy', runsHint: 'lấy trung vị, không lấy trung bình',
    warmupKnob: 'Warmup', warmupHint: 'các lần đầu bị bỏ, không tính',
    perBench: 'theo bài',
    quickMode: 'Chế độ nhanh', quickHint: 'giảm số lần chạy — để thử, không để công bố',
    measurements: 'phép đo', runBtn: 'Chạy benchmark', runningBtn: 'Đang chạy…',
    sequentialNote: 'Chạy tuần tự từng ngôn ngữ, không song song — tránh tranh CPU làm sai số liệu.',
    progress: 'Tiến trình',
    noRun: 'Chưa có kết quả nào. Sang tab "Chạy" để bắt đầu một lượt.',
    scoreTitle: 'Điểm tổng hợp',
    scoreSub: 'Càng cao càng nhanh. 100 = nhanh nhất ở mọi bài.',
    scoreAxis: 'điểm trên 100',
    formulaTitle: 'Điểm được tính thế nào',
    formulaC1: '# mỗi bài: tỉ lệ so với ngôn ngữ nhanh nhất',
    formulaC2: '# tổng: trung bình hình học của các tỉ lệ',
    formulaNotes: [
      'Trung bình hình học, không phải cộng chia — để một bài chậm bất thường không nuốt hết điểm.',
      'Mọi bài trọng số bằng nhau, không bài nào được ưu tiên.',
      'Chỉ tính bài có checksum khớp ở tất cả ngôn ngữ tham gia.',
    ],
    groupTitle: 'Điểm theo từng nhóm bài',
    groupSub: 'Cùng công thức, chỉ tính trong nhóm — đây là chỗ thứ hạng đổi theo loại việc.',
    winsTitle: 'Số bài về nhất', winsSub: 'đếm số bài mà ngôn ngữ đó nhanh nhất',
    caveatTitle: 'Đọc con số này cho đúng',
    caveatBody: 'Một con số không thay được cả bộ test. Điểm tổng phụ thuộc vào việc chọn bài nào — thêm một bài regex nữa là C++ tụt tiếp, thêm một bài CPU thuần là PHP tụt tiếp. Xem điểm theo nhóm và số liệu từng bài trước khi kết luận.',
    chartTitle: 'Thời gian trung vị theo bài test',
    logNote: 'Trục log — mỗi vạch là ×10. Bar dài gấp đôi KHÔNG có nghĩa chậm gấp đôi.',
    linNote: 'Trục thẳng — độ dài bar tỉ lệ đúng với thời gian.',
    mismatch: 'checksum lệch',
    memTitle: 'Bộ nhớ đỉnh (peak RSS)', memNote: 'lấy mức cao nhất trong các lần chạy',
    startupTitle: 'Chi phí khởi động', startupNote: 'thời gian tiến trình trừ đi thời gian làm việc',
    detailTitle: 'Chi tiết',
    guideBtn: 'Hướng dẫn bài test này',
    guideTitle: 'Bài test này làm gì',
    guideWhat: 'Đo cái gì', guideHow: 'Chương trình làm gì',
    guideChecksum: 'Checksum lấy từ đâu', guideWatch: 'Đọc cho đúng',
    guideParams: 'Tham số', guideGroup: 'Nhóm', guideRuns: 'Số lần chạy', guideMetric: 'Cách bấm đồng hồ',
    guideMissing: 'Bài này chưa có hướng dẫn. Thêm một mục vào benchmarks/guides.json.',
    guideSource: 'Nội dung nằm ở benchmarks/guides.json',
    close: 'Đóng',
    language: 'Ngôn ngữ', median: 'trung vị', wall: 'tiến trình', startupCost: 'khởi động',
    vsFastest: 'so nhanh nhất',
    savedRuns: 'Các lượt đã lưu', noRuns: 'Chưa có lượt nào được lưu.',
    cores: 'lõi', baseline: 'mốc so', setBaseline: 'Đặt làm mốc so', unsetBaseline: 'Bỏ mốc so',
    pickBaseline: 'Chọn một lượt làm mốc so, rồi chọn lượt muốn đối chiếu.',
    deltaTitle: 'Thay đổi giữa hai lượt',
    faster: 'nhanh hơn', slower: 'chậm hơn', noise: '±2% (nhiễu)',
    notComparable: 'Hai lượt này KHÔNG so sánh được với nhau — môi trường khác nhau.',
    scoreHistory: 'Điểm tổng hợp qua các lượt', scoreHistoryNote: 'chỉ so được giữa các lượt cùng môi trường',
    hostTitle: 'Môi trường chạy test',
    hostSub: 'Kèm khối này vào mọi kết quả để người khác kiểm chứng lại được.',
    copied: 'Đã copy!',
    toolchainTitle: 'Bộ công cụ', toolchainSub: 'Toolchains', version: 'Phiên bản',
    methodTitle: 'Cách đo',
  },
  en: {
    running: 'running',
    checksumOk: 'checksums match', checksumBad: 'benchmarks with MISMATCHED checksums',
    benchmarks: 'Benchmarks', benchWord: 'benchmarks', groupWord: 'groups',
    selectAll: 'Select all', clearAll: 'Clear',
    languages: 'Languages', config: 'Measurement config',
    runsKnob: 'Repetitions', runsHint: 'we report the median, not the mean',
    warmupKnob: 'Warmup', warmupHint: 'discarded, never counted',
    perBench: 'per bench',
    quickMode: 'Quick mode', quickHint: 'fewer repetitions — for trying things, not for publishing',
    measurements: 'measurements', runBtn: 'Run benchmarks', runningBtn: 'Running…',
    sequentialNote: 'Languages run strictly one at a time, never in parallel, so they never compete for CPU.',
    progress: 'Progress',
    noRun: 'No results yet. Open the "Run" tab to start one.',
    scoreTitle: 'Overall score',
    scoreSub: 'Higher is faster. 100 would mean fastest in every benchmark.',
    scoreAxis: 'score out of 100',
    formulaTitle: 'How the score is computed',
    formulaC1: '# per benchmark: ratio to the fastest language',
    formulaC2: '# overall: geometric mean of those ratios',
    formulaNotes: [
      'Geometric mean, not arithmetic — so one pathological benchmark cannot swallow the score.',
      'Every benchmark carries equal weight; none is privileged.',
      'Only benchmarks whose checksum matched across all participating languages count.',
    ],
    groupTitle: 'Score per benchmark group',
    groupSub: 'Same formula, scoped to each group — this is where the ranking changes by kind of work.',
    winsTitle: 'Benchmarks won', winsSub: 'how many benchmarks each language led',
    caveatTitle: 'Read this number carefully',
    caveatBody: 'One number cannot replace the suite. The overall score depends on which benchmarks were picked — add another regex test and C++ drops further; add another pure-CPU test and PHP drops further. Read the per-group scores and the individual numbers before concluding anything.',
    chartTitle: 'Median time per benchmark',
    logNote: 'Log axis — each gridline is ×10. A bar twice as long is NOT twice as slow.',
    linNote: 'Linear axis — bar length is proportional to time.',
    mismatch: 'checksum differs',
    memTitle: 'Peak memory (RSS)', memNote: 'highest across the repetitions',
    startupTitle: 'Startup cost', startupNote: 'process wall time minus in-program work time',
    detailTitle: 'Detail',
    guideBtn: 'How this benchmark works',
    guideTitle: 'What this benchmark does',
    guideWhat: 'What it measures', guideHow: 'What the program does',
    guideChecksum: 'Where the checksum comes from', guideWatch: 'Reading it correctly',
    guideParams: 'Parameters', guideGroup: 'Group', guideRuns: 'Repetitions', guideMetric: 'Clock',
    guideMissing: 'No guide for this benchmark yet. Add an entry to benchmarks/guides.json.',
    guideSource: 'Text lives in benchmarks/guides.json',
    close: 'Close',
    language: 'Language', median: 'median', wall: 'wall', startupCost: 'startup',
    vsFastest: 'vs fastest',
    savedRuns: 'Saved runs', noRuns: 'No runs saved yet.',
    cores: 'cores', baseline: 'baseline', setBaseline: 'Set as baseline', unsetBaseline: 'Unset baseline',
    pickBaseline: 'Pick one run as the baseline, then pick the run to compare against it.',
    deltaTitle: 'Change between two runs',
    faster: 'faster', slower: 'slower', noise: '±2% (noise)',
    notComparable: 'These two runs are NOT comparable — different environments.',
    scoreHistory: 'Overall score across runs', scoreHistoryNote: 'only comparable between runs in the same environment',
    hostTitle: 'Test environment',
    hostSub: 'Attach this block to every result so others can verify it.',
    copied: 'Copied!',
    toolchainTitle: 'Toolchains', toolchainSub: 'Bộ công cụ', version: 'Version',
    methodTitle: 'Method',
  },
};

/* ── định dạng số / number formatting ───────────────────────────────────── */
const fmtMs = (ms) => {
  if (ms == null) return '—';
  if (ms < 1) return ms.toFixed(3) + ' ms';
  if (ms < 10) return ms.toFixed(2) + ' ms';
  if (ms < 1000) return ms.toFixed(0) + ' ms';
  return (ms / 1000).toFixed(ms < 10000 ? 2 : 1) + ' s';
};
const fmtBytes = (b) => (b == null ? '—' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(0) + ' MB');
const fmtTick = (ms) => (ms < 1 ? ms + ' ms' : ms < 1000 ? ms + ' ms' : ms / 1000 + ' s');

const TAG_COLORS = { cpp: '#4c94ef', rust: '#f07a3c', go: '#39b6ae', node: '#4faa50', php: '#c76bb0' };

createApp({
  setup() {
    const lang = ref(localStorage.getItem('lb.lang') || 'vi');
    const tab = ref('run');
    const scale = ref('log');
    const registry = ref(null);
    const hostLive = ref(null);
    const runs = ref([]);
    const run = ref(null);
    const running = ref(false);
    const liveLog = ref([]);
    const progress = reactive({ done: 0, total: 0, benchmark: '', benchmarkIndex: 0, benchmarkCount: 0, language: '', languageIndex: 0, languageCount: 0, run: 0, runs: 0, phase: '' });
    const picked = reactive({ tests: [], langs: [], runs: 0, warmup: 2, quick: false });
    const selected = ref(null);
    const guides = ref({});
    const guideOpen = ref(false);
    const compareBase = ref(null);
    const baseRun = ref(null);
    const copied = ref(false);
    const logBox = ref(null);

    const t = (key) => STR[lang.value][key] ?? key;
    const setLang = (v) => {
      lang.value = v;
      localStorage.setItem('lb.lang', v);
      document.documentElement.lang = v;
    };

    const tabs = [
      { id: 'run', vi: 'Chạy', en: 'Run' },
      { id: 'overview', vi: 'Tổng quan', en: 'Overview' },
      { id: 'results', vi: 'Kết quả', en: 'Results' },
      { id: 'history', vi: 'Lịch sử', en: 'History' },
      { id: 'host', vi: 'Hệ thống', en: 'Host' },
    ];

    /* ── tải dữ liệu / data loading ── */
    async function loadRegistry() {
      registry.value = await (await fetch('/api/registry')).json();
      if (!picked.tests.length) picked.tests = registry.value.benchmarks.map((b) => b.id);
      if (!picked.langs.length) picked.langs = registry.value.languages.map((l) => l.id);
    }
    // Hướng dẫn đọc từ /api/guides, KHÔNG lấy từ snapshot registry trong file kết quả:
    // sửa guides.json phải thấy ngay, kể cả khi đang xem một lượt chạy cũ.
    // Guides come from /api/guides, NOT from the registry snapshot inside a result file:
    // an edit to guides.json must show up at once, even while viewing an old run.
    async function loadGuides() {
      try { guides.value = (await (await fetch('/api/guides')).json()).guides ?? {}; }
      catch { guides.value = {}; }
    }
    async function loadHost() {
      hostLive.value = (await (await fetch('/api/host')).json()).host;
    }
    async function loadRuns() {
      runs.value = await (await fetch('/api/runs')).json();
    }
    async function loadRun(id) {
      const r = await fetch(`/api/runs/${id}`);
      if (!r.ok) return;
      run.value = await r.json();
      if (!selected.value || !run.value.results[selected.value]) {
        selected.value = run.value.registry.benchmarks[0]?.id ?? null;
      }
    }
    watch(compareBase, async (id) => {
      baseRun.value = null;
      if (!id) return;
      const r = await fetch(`/api/runs/${id}`);
      if (r.ok) baseRun.value = await r.json();
    });

    /* ── chạy / running ── */
    function pushLog(tag, text) {
      const now = new Date();
      liveLog.value.push({
        time: now.toTimeString().slice(0, 8),
        tag,
        tagColor: TAG_COLORS[tag] ?? '#6b7482',
        text,
      });
      if (liveLog.value.length > 600) liveLog.value.splice(0, 200);
      nextTick(() => {
        if (logBox.value) logBox.value.scrollTop = logBox.value.scrollHeight;
      });
    }

    function handleEvent(e) {
      switch (e.type) {
        case 'runStarted':
          running.value = true;
          liveLog.value = [];
          progress.done = 0; progress.total = 0; progress.benchmark = '';
          pushLog('', lang.value === 'vi' ? 'bắt đầu lượt chạy' : 'run started');
          break;
        case 'host':
          pushLog('', `${e.host.env} · ${e.host.cpuModel} · ${e.host.usableCores} cores · PHP JIT ${e.host.toolchains.phpJit}`);
          break;
        case 'warn':
          pushLog('!', e[lang.value] ?? e.vi);
          break;
        case 'phase':
          if (e.phase === 'build') pushLog('', lang.value === 'vi' ? '── build ──' : '── build ──');
          if (e.phase === 'run') { progress.total = e.total; pushLog('', `── ${e.total} ${t('measurements')} ──`); }
          if (e.phase === 'done') { pushLog('', `✓ ${e.runId}`); }
          break;
        case 'log': pushLog(e.lang, e.message); break;
        case 'unavailable': pushLog(e.language, `KHÔNG CÓ / unavailable — ${e.reason}`); break;
        case 'progress':
          Object.assign(progress, e);
          break;
        case 'measurement':
          if (e.done != null) { progress.done = e.done; progress.total = e.total; }
          if (e.stats.ok) {
            pushLog(e.language, `${e.benchmark.padEnd(13)} ${fmtMs(e.stats.median)}  σ ${fmtMs(e.stats.stddev)}  rss ${fmtBytes(e.stats.rssBytes)}  ${e.stats.checksum}`);
          } else {
            pushLog(e.language, `${e.benchmark} — ${e.stats.error}`);
          }
          break;
        case 'benchmarkDone':
          if (e.checksumMatch === false) pushLog('!', `${e.benchmark}: checksum KHÔNG khớp / MISMATCH — ${JSON.stringify(e.checksums)}`);
          break;
        case 'error': pushLog('!', e.message); break;
        case 'runFinished':
          running.value = false;
          loadRuns().then(() => { if (e.runId) loadRun(e.runId).then(() => { tab.value = 'overview'; }); });
          break;
      }
    }

    function connectEvents() {
      const es = new EventSource('/api/events');
      es.onmessage = (m) => {
        try { handleEvent(JSON.parse(m.data)); } catch {}
      };
      es.onerror = () => { /* trình duyệt tự kết nối lại / the browser reconnects on its own */ };
    }

    async function startRun() {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          only: picked.tests,
          langs: picked.langs,
          runs: picked.runs > 0 ? picked.runs : undefined,
          warmup: picked.warmup,
          quick: picked.quick,
        }),
      });
      if (res.status === 409) pushLog('!', (await res.json()).error);
    }

    /* ── chọn / selection ── */
    const testsIn = (groupId) => (registry.value ? registry.value.benchmarks.filter((b) => b.group === groupId) : []);
    const toggleTest = (id) => {
      const i = picked.tests.indexOf(id);
      if (i >= 0) picked.tests.splice(i, 1); else picked.tests.push(id);
    };
    const toggleLang = (id) => {
      const i = picked.langs.indexOf(id);
      if (i >= 0) picked.langs.splice(i, 1); else picked.langs.push(id);
    };
    const selectAllTests = (on) => {
      picked.tests = on && registry.value ? registry.value.benchmarks.map((b) => b.id) : [];
    };
    const bump = (key, dir) => {
      if (key === 'runs') picked.runs = Math.max(0, Math.min(50, picked.runs + dir));
      if (key === 'warmup') picked.warmup = Math.max(0, Math.min(10, picked.warmup + dir));
    };
    const knobs = computed(() => [
      { key: 'runs', label: t('runsKnob'), hint: t('runsHint') },
      { key: 'warmup', label: t('warmupKnob'), hint: t('warmupHint') },
    ]);
    const canRun = computed(() => picked.tests.length > 0 && picked.langs.length > 0);
    const plannedCount = computed(() => picked.tests.length * picked.langs.length);
    const pct = computed(() => (progress.total ? Math.round((progress.done / progress.total) * 100) : 0));
    const progressCards = computed(() => {
      if (!progress.benchmark) return [];
      const l = registry.value?.languages.find((x) => x.id === progress.language);
      return [
        { label: lang.value === 'vi' ? 'Bài test' : 'Benchmark', value: progress.benchmark, of: `${progress.benchmarkIndex} / ${progress.benchmarkCount}`, color: null },
        { label: lang.value === 'vi' ? 'Ngôn ngữ' : 'Language', value: l?.name ?? progress.language, of: `${progress.languageIndex} / ${progress.languageCount}`, color: l?.color },
        { label: lang.value === 'vi' ? 'Lần chạy' : 'Repetition', value: progress.phase === 'warmup' ? 'warmup' : String(progress.run), of: progress.phase === 'warmup' ? '' : `/ ${progress.runs}`, color: null },
        { label: lang.value === 'vi' ? 'Đã đo' : 'Measured', value: `${progress.done}`, of: `/ ${progress.total}`, color: null },
      ];
    });
    const toolchainShort = (id) => {
      const tc = hostLive.value?.toolchains;
      if (!tc) return '';
      const raw = tc[id] ?? '';
      return raw.slice(0, 44);
    };

    /* ── điểm / scores ── */
    const langsOf = computed(() => run.value?.registry.languages ?? []);
    const ranks = computed(() => {
      if (!run.value) return [];
      return langsOf.value
        .map((l) => ({ id: l.id, name: l.name, color: l.color, score: run.value.scores.overall[l.id] }))
        .filter((r) => r.score != null)
        .sort((a, b) => b.score - a.score);
    });
    const groupBars = (groupId) => {
      if (!run.value) return [];
      const scores = run.value.scores.byGroup[groupId] ?? {};
      const vals = langsOf.value.map((l) => scores[l.id]).filter((v) => v != null);
      const best = vals.length ? Math.max(...vals) : null;
      return langsOf.value.map((l) => {
        const s = scores[l.id];
        return {
          id: l.id, name: l.name, color: l.color,
          score: s == null ? '—' : s.toFixed(0),
          width: s == null ? '0%' : Math.max(s, 0.8).toFixed(1) + '%',
          best: s != null && s === best,
        };
      });
    };
    const winRows = computed(() => {
      if (!run.value) return [];
      const total = run.value.scores.countedBenchmarks.length;
      return langsOf.value.map((l) => ({ id: l.id, name: l.name, color: l.color, n: run.value.scores.wins[l.id] ?? 0, total }));
    });

    /* ── biểu đồ kết quả / result charts ── */
    const allMedians = computed(() => {
      if (!run.value) return [];
      const out = [];
      for (const b of run.value.registry.benchmarks) {
        for (const l of langsOf.value) {
          const s = run.value.results[b.id]?.[l.id];
          if (s?.ok && s.median > 0) out.push(s.median);
        }
      }
      return out;
    });
    const axis = computed(() => {
      const vals = allMedians.value;
      if (!vals.length) return { loExp: 0, hiExp: 1, decades: 1, max: 1 };
      const loExp = Math.floor(Math.log10(Math.max(Math.min(...vals), 0.01)));
      const hiExp = Math.ceil(Math.log10(Math.max(...vals)));
      return { loExp, hiExp, decades: Math.max(1, hiExp - loExp), max: Math.max(...vals) };
    });
    const axisTicks = computed(() => {
      if (scale.value === 'linear') {
        const m = axis.value.max;
        return [0, 0.25, 0.5, 0.75, 1].map((f) => fmtMs(m * f));
      }
      const out = [];
      for (let e = axis.value.loExp; e <= axis.value.hiExp; e++) out.push(fmtTick(Math.pow(10, e)));
      return out;
    });
    const gridStyle = computed(() => {
      const steps = scale.value === 'linear' ? 4 : axis.value.decades;
      const pctStep = 100 / steps;
      return `repeating-linear-gradient(to right, #262c36 0 1px, transparent 1px ${pctStep}%)`;
    });
    const widthFor = (ms) => {
      if (!(ms > 0)) return '0.6%';
      let f;
      if (scale.value === 'linear') f = ms / axis.value.max;
      else f = (Math.log10(ms) - axis.value.loExp) / axis.value.decades;
      return Math.max(Math.min(f, 1) * 100, 0.6).toFixed(2) + '%';
    };
    function barsFor(benchId, pick, format) {
      const row = run.value.results[benchId];
      const vals = langsOf.value.map((l) => (row?.[l.id]?.ok ? pick(row[l.id]) : null)).filter((v) => v != null && v > 0);
      const best = vals.length ? Math.min(...vals) : null;
      return langsOf.value.map((l) => {
        const s = row?.[l.id];
        const v = s?.ok ? pick(s) : null;
        return {
          id: l.id, name: l.name, color: l.color,
          width: v == null ? '0%' : widthFor(v),
          label: v == null ? (s?.error ? 'lỗi' : '—') : format(v),
          best: v != null && v === best,
        };
      });
    }
    const resultColumns = computed(() => {
      if (!run.value) return [];
      const list = run.value.registry.benchmarks.map((b) => ({
        id: b.id,
        desc: b[lang.value].desc,
        checksumMatch: run.value.results[b.id]?.checksumMatch,
        bars: barsFor(b.id, (s) => s.median, fmtMs),
      }));
      const half = Math.ceil(list.length / 2);
      return [{ key: 'a', tests: list.slice(0, half) }, { key: 'b', tests: list.slice(half) }];
    });
    const sideCharts = computed(() => {
      if (!run.value) return [];
      const memBench = run.value.registry.benchmarks.find((b) => run.value.results[b.id] && langsOf.value.some((l) => run.value.results[b.id][l.id]?.rssBytes)) ?? run.value.registry.benchmarks[0];
      const linear = (pickFn, fmt, benchId) => {
        const row = run.value.results[benchId];
        const vals = langsOf.value.map((l) => (row?.[l.id]?.ok ? pickFn(row[l.id]) : null)).filter((v) => v != null);
        const max = vals.length ? Math.max(...vals) : 1;
        const best = vals.length ? Math.min(...vals) : null;
        return langsOf.value.map((l) => {
          const s = row?.[l.id];
          const v = s?.ok ? pickFn(s) : null;
          return {
            id: l.id, name: l.name, color: l.color,
            width: v == null ? '0%' : Math.max((v / max) * 100, 0.8).toFixed(1) + '%',
            label: v == null ? '—' : fmt(v),
            best: v != null && v === best,
          };
        });
      };
      const startupBench = run.value.registry.benchmarks.find((b) => b.id === 'startup');
      const out = [
        { key: 'mem', title: t('memTitle'), note: `${t('memNote')} · ${memBench.id}`, bars: linear((s) => s.rssBytes, fmtBytes, memBench.id) },
      ];
      if (startupBench) {
        out.push({ key: 'start', title: t('startupTitle'), note: t('startupNote'), bars: linear((s) => s.median, fmtMs, 'startup') });
      }
      return out;
    });

    /* ── bảng chi tiết / detail table ── */
    const selectedBench = computed(() => run.value?.registry.benchmarks.find((b) => b.id === selected.value) ?? null);
    const detailRows = computed(() => {
      if (!run.value || !selected.value) return [];
      const row = run.value.results[selected.value];
      if (!row) return [];
      const oks = langsOf.value.map((l) => row[l.id]).filter((s) => s?.ok);
      const fastest = oks.length ? Math.min(...oks.map((s) => s.median)) : null;
      const seen = Object.values(row.checksums ?? {});
      const agreed = seen.length ? seen[0] : null;
      return langsOf.value.map((l) => {
        const s = row[l.id];
        if (!s?.ok) return { id: l.id, name: l.name, color: l.color, ok: false, error: s?.error ?? '—' };
        return {
          id: l.id, name: l.name, color: l.color, ok: true,
          min: fmtMs(s.min), median: fmtMs(s.median), sigma: fmtMs(s.stddev),
          wall: fmtMs(s.wallMedian), startup: fmtMs(s.startupOverheadMs),
          rss: fmtBytes(s.rssBytes),
          ratio: '×' + (s.median / fastest).toFixed(2),
          checksum: s.checksum,
          checksumOk: agreed == null || s.checksum === agreed,
        };
      });
    });
    /* ── hướng dẫn bài test (popup dấu ?) / benchmark guide (the ? popup) ── */
    const selectedGuide = computed(() => {
      const b = selectedBench.value;
      if (!b) return null;
      const g = guides.value[b.id];
      const text = g ? (g[lang.value] ?? g.vi) : null;
      return {
        id: b.id,
        title: b[lang.value]?.title ?? b.id,
        group: b.group,
        runs: b.runs,
        metric: b.metric,
        params: Object.entries(b.params ?? {}).map(([k, v]) => `${k} = ${v}`),
        what: text?.what ?? null,
        how: text?.how ?? [],
        checksum: text?.checksum ?? null,
        watch: text?.watch ?? [],
        missing: !text,
      };
    });
    watch(selected, () => { guideOpen.value = false; });

    const selectedNotes = computed(() => {
      const b = selectedBench.value;
      if (!b?.notes) return [];
      return b.notes.map((n) => ({
        langName: langsOf.value.find((l) => l.id === n.lang)?.name ?? n.lang,
        text: n[lang.value] ?? n.vi,
      }));
    });
    const checksumSummary = computed(() => {
      if (!run.value) return { good: 0, bad: 0, total: 0 };
      let good = 0, bad = 0;
      for (const b of run.value.registry.benchmarks) {
        const m = run.value.results[b.id]?.checksumMatch;
        if (m === true) good++;
        else if (m === false) bad++;
      }
      return { good, bad, total: run.value.registry.benchmarks.length };
    });

    /* ── lịch sử / history ── */
    const comparable = computed(() => !!(baseRun.value && run.value) && baseRun.value.envKey === run.value.envKey);
    const deltaGrid = computed(() => ({
      display: 'grid',
      gridTemplateColumns: `116px repeat(${langsOf.value.length}, minmax(0, 1fr))`,
      gap: '4px',
    }));
    const deltaRows = computed(() => {
      if (!comparable.value) return [];
      return run.value.registry.benchmarks.map((b) => ({
        id: b.id,
        cells: langsOf.value.map((l) => {
          const now = run.value.results[b.id]?.[l.id];
          const before = baseRun.value.results[b.id]?.[l.id];
          if (!now?.ok || !before?.ok) return { id: l.id, bg: '#212730', ink: 'var(--dim)', label: '—' };
          const d = ((now.median - before.median) / before.median) * 100;
          if (Math.abs(d) <= 2) return { id: l.id, bg: '#212730', ink: 'var(--dim)', label: d.toFixed(0) === '0' ? '—' : (d > 0 ? '+' : '') + d.toFixed(0) + '%' };
          const mag = Math.min(Math.abs(d) / 20, 1);
          const base = [33, 39, 48];
          const target = d < 0 ? [47, 125, 82] : [141, 53, 53];
          const rgb = base.map((v, i) => Math.round(v + (target[i] - v) * (0.35 + 0.65 * mag)));
          return { id: l.id, bg: `rgb(${rgb.join(',')})`, ink: 'var(--text)', label: (d > 0 ? '+' : '') + d.toFixed(0) + '%' };
        }),
      }));
    });
    const allLangIds = computed(() => {
      const set = new Set();
      for (const r of runs.value) for (const id of r.languages ?? []) set.add(id);
      return [...set];
    });

    /* ── hệ thống / host ── */
    const hostShown = computed(() => run.value?.host ?? hostLive.value);
    const hostLine = (h) => `${h.cpuModel} · ${h.usableCores} ${t('cores')} · ${fmtBytes(h.memLimitBytes ?? h.memTotalBytes)} · ${h.osRelease}`;
    const machineRows = computed(() => {
      const h = hostShown.value;
      if (!h) return [];
      const rows = [
        { k: 'Môi trường', k2: 'Environment', v: h.env === 'docker' ? 'Docker container' : 'Native (chạy trực tiếp)' },
        { k: 'CPU', k2: 'Processor', v: `${h.cpuModel} (${h.arch})` },
        { k: 'Số lõi', k2: 'Cores', v: h.perfCores ? `${h.cpuCount} (${h.perfCores} hiệu năng + ${h.effCores} tiết kiệm điện)` : String(h.cpuCount) },
        { k: 'Lõi dùng được', k2: 'Usable cores', v: h.cpuLimit ? `${h.usableCores} (cgroup giới hạn ${h.cpuLimit})` : String(h.usableCores) },
        { k: 'RAM', k2: 'Memory', v: h.memLimitBytes ? `${fmtBytes(h.memLimitBytes)} (giới hạn container) / ${fmtBytes(h.memTotalBytes)} máy` : fmtBytes(h.memTotalBytes) },
        { k: 'Hệ điều hành', k2: 'OS', v: h.osRelease },
        { k: 'Kernel', k2: 'Kernel', v: h.kernel },
        { k: 'Load average', k2: 'Load average', v: h.loadAvg.join('  ') },
      ];
      if (h.power) rows.push({ k: 'Nguồn điện', k2: 'Power', v: h.power === 'ac' ? 'AC power' : 'Pin — số liệu KHÔNG dùng được' });
      rows.push({ k: 'PHP JIT', k2: 'PHP JIT', v: h.toolchains.phpJit });
      rows.push({ k: 'Ruby YJIT', k2: 'Ruby YJIT', v: h.toolchains.rubyJit ?? '—' });
      return rows;
    });
    const toolchainRows = computed(() => {
      const h = hostShown.value;
      const langs = registry.value?.languages ?? [];
      if (!h) return [];
      return langs.map((l) => ({ id: l.id, name: l.name, color: l.color, version: h.toolchains[l.id] ?? '—' }));
    });
    const methodNotes = [
      { vi: 'Mỗi cặp (bài × ngôn ngữ) chạy nhiều lần, lấy TRUNG VỊ — không lấy trung bình.', en: 'Every benchmark × language pair runs several times; we report the MEDIAN, not the mean.' },
      { vi: 'Các lần warmup đầu bị loại bỏ hoàn toàn khỏi số liệu.', en: 'The warmup repetitions are discarded entirely.' },
      { vi: 'Chạy tuần tự từng ngôn ngữ, không song song — tránh tranh CPU làm lệch kết quả.', en: 'Languages run strictly one at a time, never in parallel, so they never compete for CPU.' },
      { vi: 'Mỗi bài in ra một checksum; kết quả chỉ được tính khi mọi ngôn ngữ cho cùng giá trị.', en: 'Every benchmark prints a checksum; a result only counts when all languages agree on it.' },
      { vi: 'Đo cả thời gian bên trong chương trình và thời gian tiến trình, nên chi phí khởi động luôn nhìn thấy được.', en: 'We time both the work inside the program and the whole process, so startup cost stays visible.' },
      { vi: 'Cùng một thuật toán ở mọi ngôn ngữ — không SIMD viết tay, không memoize, không thư viện ngoài trừ khi ghi rõ trong ghi chú của bài.', en: 'The same algorithm everywhere — no hand-written SIMD, no memoisation, no external libraries unless the benchmark note says so.' },
    ];

    async function copyMarkdown() {
      const h = hostShown.value;
      if (!h) return;
      const lines = [
        '## lang-bench — môi trường chạy test / test environment',
        '',
        '| | |',
        '|---|---|',
        ...machineRows.value.map((r) => `| ${r.k} / ${r.k2} | ${r.v} |`),
        '',
        '### Toolchains',
        '',
        '| Ngôn ngữ / Language | Phiên bản / Version |',
        '|---|---|',
        ...toolchainRows.value.map((r) => `| ${r.name} | ${r.version} |`),
      ];
      if (run.value) {
        lines.push('', `### ${run.value.runId} — điểm tổng hợp / overall score`, '', '| # | Ngôn ngữ | Điểm |', '|---|---|---|');
        ranks.value.forEach((r, i) => lines.push(`| ${i + 1} | ${r.name} | ${r.score.toFixed(1)} |`));
      }
      try {
        await navigator.clipboard.writeText(lines.join('\n'));
        copied.value = true;
        setTimeout(() => (copied.value = false), 1600);
      } catch { /* clipboard bị chặn / clipboard blocked */ }
    }

    const fmtDate = (iso) => new Date(iso).toLocaleString(lang.value === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' });
    const fmtDur = (ms) => (ms == null ? '—' : ms < 60000 ? (ms / 1000).toFixed(1) + ' s' : Math.floor(ms / 60000) + ' ph ' + Math.round((ms % 60000) / 1000) + ' gy');

    onMounted(async () => {
      document.documentElement.lang = lang.value;
      window.addEventListener('keydown', (e) => { if (e.key === 'Escape') guideOpen.value = false; });
      await loadRegistry();
      loadGuides();
      loadHost();
      await loadRuns();
      const status = await (await fetch('/api/status')).json();
      running.value = status.running;
      const first = runs.value[0];
      if (first) { await loadRun(first.runId); tab.value = 'overview'; }
      connectEvents();
    });

    return {
      lang, setLang, t, tab, tabs, scale, registry, runs, run, running, liveLog, progress, picked, selected,
      compareBase, baseRun, copied, logBox, hostLive,
      testsIn, toggleTest, toggleLang, selectAllTests, bump, knobs, canRun, plannedCount, pct, progressCards,
      toolchainShort, startRun, loadRun,
      ranks, groupBars, winRows, resultColumns, sideCharts, axisTicks, gridStyle,
      selectedBench, detailRows, selectedNotes, checksumSummary, selectedGuide, guideOpen,
      comparable, deltaGrid, deltaRows, allLangIds,
      hostShown, hostLine, machineRows, toolchainRows, methodNotes, copyMarkdown,
      fmtDate, fmtDur, fmtMs, fmtBytes,
    };
  },
}).mount('#app');
