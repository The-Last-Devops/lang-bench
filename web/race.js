// Màn hình đua dọc 9:16. Điểm được cộng ngay khi từng phép đo về từ runner,
// không chờ hết lượt chạy.
// The vertical 9:16 race screen. Points land the moment each measurement
// arrives from the runner — nothing waits for the run to finish.

const LANGS = [
  { id: 'cpp', label: 'C++', color: '#4C8DFF' },
  { id: 'rust', label: 'Rust', color: '#F2703C' },
  { id: 'go', label: 'Go', color: '#2FCBDE' },
  { id: 'node', label: 'Node', color: '#8FD14F' },
];
const LANG_IDS = LANGS.map((l) => l.id);

const $ = (id) => document.getElementById(id);
const stage = $('stage'), rail = $('rail'), wins = $('wins'), board = $('board');
const nowName = $('nowName'), nowMs = $('nowMs'), footEnv = $('footEnv'), go = $('go'), clock = $('clock');
const subDot = $('subDot'), subTxt = $('subTxt'), subCnt = $('subCnt');
const nowDots = $('nowDots'), subDots = $('subDots');

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (n) => Math.round(n).toLocaleString('en-US');

/* ── khung: giữ đúng 9:16, luôn vừa màn hình ── */
function fit() {
  const box = $('fit');
  const s = Math.min(box.clientWidth / 1080, box.clientHeight / 1920);
  stage.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
}
addEventListener('resize', fit);
fit();
if (document.fonts?.ready) document.fonts.ready.then(fit);


/* ── tween theo thời gian ──
   Easing kiểu `v += (đích - v) * k` lao rất nhanh rồi bò: tới cuối mỗi frame
   chỉ nhích chưa tới 1 đơn vị, làm chữ số đứng im nhiều frame rồi nhảy một nấc
   — mắt đọc ra thành giật cục. Tween có thời lượng cố định thì tốc độ luôn đủ
   để con số đổi mỗi frame, và bảo đảm về đúng đích.

   A `v += (goal - v) * k` ease sprints then crawls: near the end it advances
   less than one unit per frame, so the rendered digit freezes for several frames
   and then jumps — which reads as stutter. A fixed-duration tween always moves
   fast enough to change every frame, and is guaranteed to arrive. */
function tween() { return { v: 0, from: 0, to: 0, t0: 0, dur: 0 }; }

function tweenTo(t, to, dur) {
  if (to === t.to && t.dur > 0) return;      // đích không đổi thì đừng khởi động lại
  t.from = t.v; t.to = to; t.t0 = performance.now(); t.dur = dur;
}

function tweenSet(t, v) { t.v = t.from = t.to = v; t.dur = 0; }

function tweenStep(t, now) {
  if (t.dur <= 0) { t.v = t.to; return false; }
  const p = Math.min(1, (now - t.t0) / t.dur);
  const e = 1 - Math.pow(1 - p, 3);          // easeOutCubic: dịu ở cuối, không bò
  t.v = t.from + (t.to - t.from) * e;
  if (p >= 1) { t.dur = 0; return false; }
  return true;
}

const TW_SCORE = 820, TW_ROUND = 1100;
let lastTick = 0;


/* ── âm thanh ──
   Tổng hợp bằng WebAudio: không file, không mạng, không phụ thuộc CDN nào.
   Trình duyệt chặn phát tiếng trước khi người dùng bấm gì, nên AudioContext chỉ
   được dựng ngay trong cú click — không phải lúc tải trang.

   Synthesised with WebAudio: no files, no network, no CDN. Browsers refuse to play
   before a user gesture, so the AudioContext is built inside the click itself,
   never at load. */
let ac = null;
const sound = true;

/* Trình duyệt không cho phát tiếng trước khi người dùng chạm vào trang, nên
   AudioContext được dựng ở cử chỉ đầu tiên bất kỳ — bấm Run, chạm, hay gõ phím —
   rồi từ đó tiếng luôn bật, không có nút tắt.
   Browsers refuse audio before the page is touched, so the AudioContext is built on
   the first gesture of any kind — the Run click, a tap, a key — and from then on
   sound is simply always on, with no toggle to find. */
let master = null;
function armAudio() {
  if (!ac) {
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    master = ac.createGain();
    master.gain.value = 0.9;
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  if (ac.state === 'running') showHint(false);
}
// Chỉ những cử chỉ này mới mở khoá âm thanh — di chuột hay cuộn thì không tính.
// Only these count as activation for audio; moving the mouse or scrolling does not.
for (const ev of ['pointerdown', 'pointerup', 'keydown', 'touchstart', 'click']) {
  addEventListener(ev, armAudio, { passive: true });
}

/* F5 giữa lượt chạy là mất tiếng: trang mới chưa nhận cử chỉ nào, mà nút Run lúc đó
   đang khoá nên không có gì rõ ràng để bấm. Gợi ý này nằm NGOÀI khung 9:16 nên không
   lọt vào clip, và biến mất ngay ở cú chạm đầu tiên.
   Reloading mid-run kills the sound: the fresh page has had no gesture, and Run is
   disabled while a run is going, so there is nothing obvious to click. This hint sits
   OUTSIDE the 9:16 frame — it cannot reach the clip — and goes at the first touch. */
function showHint(on) {
  const h = document.getElementById('hint');
  if (h) h.dataset.on = on ? '1' : '0';
}

function beep({ freq = 440, dur = 0.12, type = 'triangle', gain = 0.16, delay = 0 } = {}) {
  if (!sound || !ac) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  // Tấn công nhanh rồi tắt theo hàm mũ — dừng đột ngột sẽ nghe thành tiếng "cụp".
  // Fast attack, exponential tail: cutting a note dead is heard as a click.
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master || ac.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

// Hạng 1 cao và sáng nhất, càng xuống hạng càng trầm — nghe là biết thứ tự.
// First place rings highest; each step down sits lower, so the order is audible.
const RANK_HZ = [0, 1046.5, 784, 659.3, 523.3];

function sfxRank(p) {
  beep({ freq: RANK_HZ[p] || 523.3, dur: 0.22, gain: 0.3 });
  if (p === 1) [784, 1046.5, 1568].forEach((f, i) => beep({ freq: f, dur: 0.32, type: 'sine', gain: 0.22, delay: i * 0.09 }));
}
const sfxTick = () => beep({ freq: 180 + Math.random() * 40, dur: 0.035, type: 'square', gain: 0.075 });
const sfxBlip = () => beep({ freq: 660, dur: 0.07, type: 'sine', gain: 0.16 });
function sfxDone() {
  [523.3, 659.3, 784, 1046.5].forEach((f, i) => beep({ freq: f, dur: 0.5, type: 'sine', gain: 0.24, delay: i * 0.13 }));
}

/* ── trạng thái ── */
let benches = [];                 // [{id}] theo đúng thứ tự runner chạy
let refMs = {};                   // mốc cố định để quy ra điểm
const target = {};                // điểm hiển thị = đã chốt + tạm tính
// Điểm chốt chỉ đổi khi cả phép đo xong; điểm tạm nhích theo TỪNG lần lặp, để con
// số lớn sống suốt lượt chạy thay vì chỉ giật 48 nhịp.
// Settled points move only when a measurement completes; provisional points move on
// EVERY repetition, so the big number lives through the run instead of jerking 48 times.
const settled = {};               // điểm đã chốt
const prov = {};                  // điểm tạm của bài đang đo dở
const buf = {};                   // buf[langId] = các mẫu ms của bài đang đo dở
const shown = {};                 // điểm đang hiển thị, bò dần tới target
const pts = {};                   // pts[benchId][langId]
const mid = {};                   // mid[benchId][langId] = median ms, để dựng popup so sánh
const failed = {};                // failed[benchId][langId] = lý do hỏng
let doneCount = 0, totalCount = 0; // tiến độ tổng, lấy từ event của runner

// Mỗi con số trên màn hình đều bò tới đích thay vì nhảy — điểm, mốc ms, và số điểm vừa ăn.
// Every figure on screen creeps to its mark instead of jumping — score, round ms, and points won.
const dGain = {}, dGainTo = {};   // số điểm vòng này
const dMs = {}, dMsTo = {};       // thời gian median vòng này
const dRatio = {};                // bội số so với người nhanh nhất
const twScore = {}, twGain = {}, twMs = {};
let noteUntil = 0;                // kết quả vòng hiện tới lúc nào
let segs = [], winEls = [], rows = [];
let running = false, dead = new Set();
let startedAt = 0, elapsedMs = 0;   // đồng hồ giây cạnh nút Run / the seconds clock beside Run

for (const l of LANGS) {
  target[l.id] = 0; settled[l.id] = 0; prov[l.id] = 0; buf[l.id] = []; shown[l.id] = 0;
  dGain[l.id] = dGainTo[l.id] = dMs[l.id] = dMsTo[l.id] = 0; dRatio[l.id] = '';
  twScore[l.id] = tween(); twGain[l.id] = tween(); twMs[l.id] = tween();
}

/* ── dựng khung xương một lần, sau khi biết có bao nhiêu bài test ── */
function build() {
  const cols = 'repeat(' + benches.length + ',1fr)';
  rail.style.gridTemplateColumns = cols;
  wins.style.gridTemplateColumns = cols;

  segs = benches.map(() => {
    const d = document.createElement('div');
    d.className = 'seg'; d.innerHTML = '<i></i>';
    rail.appendChild(d); return d.firstChild;
  });
  winEls = benches.map(() => {
    const d = document.createElement('div');
    d.className = 'win'; wins.appendChild(d); return d;
  });

  rows = LANGS.map((l) => {
    const el = document.createElement('div');
    el.className = 'row';
    el.style.color = l.color;
    el.innerHTML =
      '<div class="glow"></div>' +
      '<div class="score">0</div>' +
      '<div class="head"><div class="rankwrap">' +
        '<div class="rank" style="--c:' + l.color + '"><span></span></div>' +
        '<i class="ring" style="color:' + l.color + '"></i>' +
      '</div>' +
      '<div class="chip" style="background:' + l.color + '"></div>' +
      '<div class="name">' + l.label + '</div>' +
      '<div class="stat"></div>' +
      '<div class="note"></div>' +
      '<div class="delta" style="color:' + l.color + '"></div></div>' +
      '<div class="track"><u style="background:' + l.color + '"></u><i style="background:' + l.color + '"></i></div>';
    board.appendChild(el);
    return {
      ...l, el,
      score: el.querySelector('.score'),
      bar: el.querySelector('.track i'),
      ghost: el.querySelector('.track u'),
      rank: el.querySelector('.rank'),
      rankNum: el.querySelector('.rank span'),
      ring: el.querySelector('.ring'),
      note: el.querySelector('.note'),
      stat: el.querySelector('.stat'),
      delta: el.querySelector('.delta'),
    };
  });

  // Chiều cao hàng chia đều theo vùng còn lại, không đặt cứng bằng số.
  // Row pitch is divided out of the space that is actually left, never hard-coded.
  const pitch = board.clientHeight / LANGS.length;
  for (const r of rows) r.el.style.height = pitch + 'px';
  rows.pitch = pitch;

  layout();
}

/* ── xếp hạng + vẽ ── */
function layout() {
  const order = [...rows].sort((a, b) => target[b.id] - target[a.id]);
  order.forEach((r, rank) => {
    r.el.style.transform = 'translateY(' + rank * rows.pitch + 'px)';
    r.el.style.transition = reduced ? 'none' : 'transform .55s cubic-bezier(.4,1.3,.5,1)';
  });
}

function draw() {
  const lead = Math.max(...LANG_IDS.map((id) => shown[id]), 1);
  for (const r of rows) {
    r.score.textContent = fmt(shown[r.id]);
    r.bar.style.width = (shown[r.id] / lead * 100) + '%';
    r.el.dataset.out = dead.has(r.id) ? '1' : '0';
    if (r.note.dataset.on === '1') {
      r.note.innerHTML = dMsTo[r.id] > 0
        ? '<b>' + dMs[r.id].toFixed(1) + ' ms</b> · ' + dRatio[r.id] + ' · <b>+' + fmt(dGain[r.id]) + '</b>'
        : 'FAIL';
    }
  }
}

// Điểm bò dần tới mốc thật — để người xem thấy nó tăng, không nhảy phát một.
// Scores creep toward the real figure so the climb is visible, not a jump.
function tick() {
  const now = performance.now();
  let moving = false, climbing = false;
  for (const id of LANG_IDS) {
    const before = twScore[id].v;
    if (tweenStep(twScore[id], now)) moving = true;
    shown[id] = twScore[id].v;
    // Tích tắc thưa theo mức điểm nhích được, không phải theo frame — nếu theo frame
    // thì 60 tiếng mỗi giây, chói tai.
    // Ticks are spaced by how far the score moved, not per frame: per frame would be
    // sixty of them a second.
    if (shown[id] - before > 0.5) climbing = true;
    tweenStep(twGain[id], now); dGain[id] = twGain[id].v;
    tweenStep(twMs[id], now);   dMs[id] = twMs[id].v;
  }

  // Điểm đang bò lên thì rải tiếng tích tắc đều theo thời gian. Cách cũ đo mức
  // nhích mỗi frame nên những lượt cộng nhỏ không bao giờ chạm ngưỡng — im tiếng.
  // While any score climbs, ticks are spaced by time. The old rule measured the
  // per-frame step, so small gains never reached the threshold and stayed silent.
  if (sound && climbing && now - lastTick > 55) { lastTick = now; sfxTick(); }

  // Kết quả vòng chỉ đứng lại một nhịp rồi nhường chỗ cho vòng sau.
  // A round's result holds for a beat, then clears the way for the next one.
  if (noteUntil && Date.now() > noteUntil) {
    noteUntil = 0;
    rows.forEach((r) => {
      r.note.dataset.on = '0'; r.el.dataset.win = '0'; r.ghost.style.width = '0%';
      clearTimeout(r.rankTimer); r.rank.dataset.on = '0'; r.ring.dataset.on = '0';
    });
  }
  draw();
  if (moving) layout();
  if (running && startedAt) elapsedMs = Date.now() - startedAt;
  clock.textContent = (elapsedMs / 1000).toFixed(1) + 's';
  requestAnimationFrame(tick);
}

/* ── nạp cấu hình ── */
async function boot() {
  const [registry, reference] = await Promise.all([
    fetch('/api/registry').then((r) => r.json()),
    fetch('/api/reference').then((r) => r.json()),
  ]);
  benches = registry.benchmarks.map((b) => b.id);
  refMs = reference.refMs;
  build();

  fetch('/api/host').then((r) => r.json()).then(({ host }) => {
    footEnv.textContent = [host.env, host.usableCores + ' cores', host.arch].join(' · ').toUpperCase();
  }).catch(() => {});

  const status = await fetch('/api/status').then((r) => r.json());
  if (status.running && (!ac || ac.state !== 'running')) showHint(true);
  setRunning(status.running);
  connect();
  requestAnimationFrame(tick);
}

function setRunning(on) {
  // Bắt đầu thì khởi động đồng hồ; dừng thì giữ nguyên số cuối cùng.
  // Starting resets the clock; stopping freezes it on the final figure.
  if (on && !running) startedAt = Date.now();
  if (!on) startedAt = 0;
  running = on;
  go.disabled = on;
  go.textContent = on ? 'Running' : 'Run';
}

function reset() {
  dead = new Set();
  elapsedMs = 0;
  startedAt = running ? Date.now() : 0;
  for (const id of LANG_IDS) {
    target[id] = 0; settled[id] = 0; prov[id] = 0; buf[id] = []; shown[id] = 0;
    tweenSet(twScore[id], 0); tweenSet(twGain[id], 0); tweenSet(twMs[id], 0);
  }
  for (const k of Object.keys(pts)) delete pts[k];
  for (const k of Object.keys(mid)) delete mid[k];
  for (const k of Object.keys(failed)) delete failed[k];
  doneCount = 0; totalCount = 0;
  noteUntil = 0;
  for (const id of LANG_IDS) { dGain[id] = dGainTo[id] = dMs[id] = dMsTo[id] = 0; dRatio[id] = ''; }
  rows.forEach((r) => {
    r.el.dataset.win = '0';
    r.note.dataset.on = '0'; r.note.innerHTML = '';
    r.stat.dataset.on = '0'; r.stat.innerHTML = '';
    r.ghost.style.width = '0%';
    clearTimeout(r.rankTimer); r.rank.dataset.on = '0'; r.ring.dataset.on = '0';
  });
  setSub('', '', false);
  setNow(null, running);
  segs.forEach((s) => (s.style.transform = 'scaleX(0)'));
  winEls.forEach((el) => { el.style.background = ''; el.style.transform = ''; el.style.opacity = ''; delete el.dataset.new; });
  rows.forEach((r) => { r.delta.style.opacity = 0; r.delta.textContent = ''; });
  nowMs.textContent = '';
  draw(); layout();
}


// Runner nói tiếng Việt cho CLI dùng chung; màn hình đua thì chỉ tiếng Anh.
// The runner speaks Vietnamese for its shared CLI; the race screen stays English.
function en(msg) {
  return String(msg)
    .replace(/^LỖI build:/, 'BUILD FAILED:')
    .replace(/^LỖI /, 'FAILED ')
    .replace(/^bỏ qua — không tìm thấy /, 'skipped \u2014 no ')
    .replace(/không tìm thấy /, 'no ')
    .replace(/không rõ/, 'unknown')
    .replace(/^không có ngôn ngữ nào build được$/, 'no language built successfully')
    .replace(/^đang có một lượt chạy.*/, 'a run is already in progress')
    .replace(/^không còn bài test nào sau khi lọc.*/, 'no benchmarks left after filtering')
    .replace(/^không còn ngôn ngữ nào sau khi lọc.*/, 'no languages left after filtering')
    .replace(/^không có lượt chạy này$/, 'no such run')
    .replace(/^không có API này$/, 'no such endpoint')
    .replace(/^build thất bại: /, 'build failed: ')
    .replace(/^checksum không ổn định giữa các lần chạy/, 'checksum unstable across runs');
}

/* ── dòng trạng thái: lấp khoảng trống giữa các phép đo ── */
/* The status line: fills the dead air between measurements. */
// Trạng thái chỉ sống ở hàng đang được đo; các hàng khác tắt.
// The live status lives only in the row being measured; every other row goes dark.
function setStat(langId, html) {
  // Kết quả vòng đang chiếm hàng thì im lặng. Gọi setStat(null) một lần lúc kết quả bật
  // lên là chưa đủ: bài test kế tiếp bắn 'progress' ngay sau đó và ghi đè trạng thái
  // trở lại, nên hai thứ cùng hiện và bóp nhau còn "ru…".
  // Stay quiet while a round result owns the row. Clearing once when the result appears
  // is not enough: the next benchmark fires 'progress' moments later and writes the
  // status straight back, so both showed at once and squeezed down to "ru…".
  if (noteUntil && Date.now() < noteUntil) return;
  for (const r of rows) {
    const on = r.id === langId && html;
    // Ba chấm nhấp nháy đi kèm: nhìn một cái là biết hàng nào đang thực sự chạy, kể cả
    // khi dòng chữ đứng yên hàng giây giữa hai lần đo.
    // The blinking ellipsis rides along: it says at a glance which row is actually
    // working, even while the text sits unchanged for seconds between measurements.
    r.stat.innerHTML = on ? html + '<span class="dots" data-on="1">...</span>' : '';
    r.stat.dataset.on = on ? '1' : '0';
  }
}

function setSub(text, count, live) {
  subTxt.textContent = text || '';
  subCnt.textContent = count || '';
  subDot.dataset.live = live ? '1' : '0';
  subDots.dataset.on = live && text ? '1' : '0';
  subDot.parentElement.dataset.done = '0';
}

// Ba chấm là lời hứa: còn chạy thì còn nhấp. Đứng yên ở READY / DONE / lỗi.
// The ellipsis is a promise: it blinks only while something is running.
// It sits still on READY, DONE and errors.
function setNow(text, busy) {
  if (text != null) nowName.textContent = text;
  nowDots.dataset.on = busy ? '1' : '0';
}

/* ── sự kiện thật từ runner ── */

/* ── kết quả một vòng: bày ngay trong hàng, không che gì cả ── */
/* One round's result: laid out inside the rows, covering nothing. */
// Hạng cuối nảy ở ~0.5s, nên vẫn còn hơn 3s đứng yên để đọc.
// The last position pops at ~0.5s, leaving over 3s of stillness to read it.
const ROUND_MS = 3600;

function revealRound(benchId, winner) {
  const ms = mid[benchId] ?? {}, gp = pts[benchId] ?? {}, bad = failed[benchId] ?? {};
  const best = Math.min(...LANG_IDS.map((k) => ms[k] ?? Infinity));

  // Xếp hạng của riêng vòng này: nhanh nhất là 1, ngôn ngữ hỏng không có hạng.
  // This round's own standings: fastest is 1, anything broken gets no position.
  const place = {};
  [...rows]
    .filter((r) => bad[r.id] == null && ms[r.id] != null)
    .sort((a, b) => ms[a.id] - ms[b.id])
    .forEach((r, i) => (place[r.id] = i + 1));

  for (const r of rows) {
    const broken = bad[r.id] != null || ms[r.id] == null;
    dMsTo[r.id] = broken ? 0 : ms[r.id];
    dGainTo[r.id] = broken ? 0 : (gp[r.id] ?? 0);
    dRatio[r.id] = broken ? '' : (ms[r.id] / best).toFixed(2) + '\u00D7';
    tweenSet(twMs[r.id], 0); tweenSet(twGain[r.id], 0);          // đếm lên từ 0 / count up from zero
    tweenTo(twMs[r.id], dMsTo[r.id], TW_ROUND);
    tweenTo(twGain[r.id], dGainTo[r.id], TW_ROUND);

    // Vạch mờ dài = vòng này chạy nhanh; tỉ lệ nghịch thời gian nên người thắng đầy vạch.
    // A longer ghost bar means a faster round: inverse of time, so the winner fills it.
    r.ghost.style.width = (broken ? 0 : (best / ms[r.id]) * 100) + '%';
    r.note.dataset.on = '1';
    r.delta.style.opacity = 0;
    r.el.dataset.win = r.id === winner.id && !broken ? '1' : '0';

    // Số hạng nảy lên theo thứ tự 1→4, mỗi hạng cách nhau một nhịp ngắn,
    // để mắt kịp đọc ai nhất trước khi thấy phần còn lại.
    // Positions pop in order 1→4, a beat apart, so the eye reads who won
    // before the rest of the field arrives.
    const p = place[r.id];
    r.rankNum.textContent = broken ? '—' : p;
    r.rank.dataset.p = broken ? 'x' : (p === 1 ? '1' : '2');
    clearTimeout(r.rankTimer);
    r.rank.dataset.on = '0'; r.ring.dataset.on = '0';
    r.rankTimer = setTimeout(() => {
      // Gán lại data-on ở frame sau khi đã gỡ, nếu không animation cũ không khởi động lại.
      // Re-arm on a later frame than the clear, or the animation will not restart.
      r.rank.dataset.on = '1';
      if (!broken) r.ring.dataset.on = '1';
      sfxRank(broken ? 4 : p);
    }, broken ? 520 : (p - 1) * 230);
  }
  setStat(null, '');
  noteUntil = Date.now() + ROUND_MS;
}

function onMeasurement(e) {
  const { benchmark, language, stats } = e;
  if (!LANG_IDS.includes(language)) return;

  const row = rows.find((r) => r.id === language);
  if (!stats.ok) {
    (failed[benchmark] ??= {})[language] = stats.error ?? 'lỗi';
    // Bỏ điểm tạm của bài hỏng, nếu không nó dính lại vĩnh viễn.
    // Drop the failed benchmark's provisional points, or they stick forever.
    prov[language] = 0;
    buf[language] = [];
    target[language] = settled[language];
    tweenTo(twScore[language], target[language], TW_SCORE);
    dead.add(language);
    if (row) { row.delta.style.opacity = 1; row.delta.textContent = 'FAIL'; }
    return;
  }

  if (!refMs[benchmark]) {
    setSub('no reference for ' + benchmark, '', false);
    return;
  }
  const gained = Math.round(1000 * refMs[benchmark] / stats.median);
  (pts[benchmark] ??= {})[language] = gained;
  (mid[benchmark] ??= {})[language] = stats.median;
  settled[language] += gained;
  prov[language] = 0;
  buf[language] = [];
  target[language] = settled[language];
  tweenTo(twScore[language], target[language], TW_SCORE);
  sfxBlip();

  if (row && !noteUntil) {
    row.delta.textContent = '+' + fmt(gained);
    row.delta.style.opacity = 1;
    setTimeout(() => (row.delta.style.opacity = 0), 900);
  }

  // Bài test coi như xong khi mọi ngôn ngữ còn sống đã đo — lúc đó mới chấm ai thắng.
  // A benchmark is done once every surviving language has reported; only then is a winner drawn.
  const i = benches.indexOf(benchmark);
  const need = LANG_IDS.filter((id) => !dead.has(id)).length;
  const have = Object.keys(pts[benchmark]).length;
  if (i >= 0) {
    segs[i].style.transform = 'scaleX(' + Math.min(1, have / need) + ')';
    if (have >= need) {
      const winner = LANGS.reduce((a, b) => ((pts[benchmark][b.id] ?? -1) > (pts[benchmark][a.id] ?? -1) ? b : a));
      winEls[i].style.background = winner.color;
      winEls[i].style.transform = 'scale(1)';
      winEls[i].style.opacity = '1';
      winEls[i].dataset.new = '1';
      setTimeout(() => delete winEls[i].dataset.new, 600);
      revealRound(benchmark, winner);
    }
  }
  setNow(benchmark.toUpperCase(), true);
  nowMs.textContent = stats.median.toFixed(1) + ' MS';
}

function handle(e) {
  switch (e.type) {
    case 'runStarted': reset(); setRunning(true); setNow('STARTING', true); break;
    case 'phase':
      if (e.phase === 'build') { setNow('BUILDING', true); setSub('preparing toolchains', '', true); }
      if (e.phase === 'run') {
        setNow('RUNNING', true);
        totalCount = e.total ?? 0;
        setSub('starting measurements', '0/' + totalCount, true);
      }
      break;

    // Build chạy tuần tự và lâu — nói rõ đang compile ngôn ngữ nào, đừng để màn hình đứng im.
    // The build is serial and slow — name the language being compiled instead of freezing.
    case 'log': {
      const l = LANGS.find((x) => x.id === e.lang);
      const raw = e.message || '';
      const bad = /^LỖI|^bỏ qua/.test(raw);
      // Build là phần dài nhất của lượt chạy và là thứ duy nhất chuyển động lúc đó
      // — cho nó sáng bằng chữ chính, đừng để chìm như ghi chú phụ.
      // The build is the longest stretch of a run and the only thing moving during it,
      // so it reads at full text brightness instead of sinking to a footnote.
      // Log build cũng thuộc về một ngôn ngữ cụ thể, nên nó phải xuống đúng hàng của
      // ngôn ngữ đó như mọi trạng thái khác — trước đây chỉ 'progress' và 'sample' được
      // định tuyến xuống hàng, còn build thì kẹt lại trên dòng đỉnh.
      // A build log belongs to one language too, so it goes to that language's row like
      // every other status. Only 'progress' and 'sample' were routed down before; the
      // build phase stayed stranded on the top line.
      setStat(e.lang, en(raw));
      setSub(bad ? en(raw) : 'compiling', '', !bad);
      break;
    }

    // Mỗi lần chạy warmup / đo đều báo — đây chính là khoảng trống trước đây.
    // Every warmup and measured run reports in — this was the dead air.
    case 'progress': {
      const l = LANGS.find((x) => x.id === e.language);
      const what = e.phase === 'warmup' ? 'warm-up' : 'run ' + e.run + '/' + e.runs;
      doneCount = e.done ?? doneCount;
      totalCount = e.total ?? totalCount;
      setNow((e.benchmark || '').toUpperCase(), true);
      setStat(e.language, what);
      // Dòng trên đỉnh chỉ còn giữ tiến độ tổng — chi tiết ngôn ngữ đã nằm trong hàng.
      // The top line keeps only overall progress; the per-language detail is in the row.
      setSub('measuring', doneCount + '/' + totalCount, true);
      break;
    }

    // Mỗi lần lặp cho một mốc tạm: median của các mẫu đã có, quy ra điểm ngay.
    // 'measurement' sau đó chốt lại chính xác, nên số tạm không làm sai kết quả.
    // Each repetition yields a provisional mark — the median of the samples so far,
    // scored at once. 'measurement' then settles it exactly, so the provisional
    // figure never corrupts the result.
    case 'sample': {
      nowMs.textContent = e.ms.toFixed(1) + ' MS';
      setStat(e.language, e.ms.toFixed(1) + ' <u>ms</u>');
      if (!LANG_IDS.includes(e.language) || !refMs[e.benchmark]) break;
      buf[e.language].push(e.ms);
      const q = [...buf[e.language]].sort((a, b) => a - b);
      const m = q.length % 2 ? q[(q.length - 1) / 2] : (q[q.length / 2 - 1] + q[q.length / 2]) / 2;
      prov[e.language] = Math.round(1000 * refMs[e.benchmark] / m);
      target[e.language] = settled[e.language] + prov[e.language];
      tweenTo(twScore[e.language], target[e.language], TW_SCORE);
      break;
    }
    case 'unavailable':
      if (LANG_IDS.includes(e.language)) dead.add(e.language);
      break;
    case 'measurement':
      doneCount = e.done ?? doneCount; totalCount = e.total ?? totalCount;
      subCnt.textContent = doneCount + '/' + totalCount;
      onMeasurement(e);
      break;
    case 'error':
      footEnv.textContent = en(e.message).slice(0, 60).toUpperCase();
      footEnv.dataset.bad = '1';
      setNow(null, false);
      break;
    case 'runFinished':
      setStat(null, '');
      setRunning(false);
      setNow('DONE', false);
      nowMs.textContent = '';
      sfxDone();
      setSub(benches.length + ' benchmarks complete', doneCount + '/' + totalCount, false);
      subDot.parentElement.dataset.done = '1';
      break;
  }
}

function connect() {
  const es = new EventSource('/api/events');
  es.onmessage = (m) => { try { handle(JSON.parse(m.data)); } catch {} };
}

go.onclick = async () => {
  if (running) return;
  armAudio();
  setRunning(true);
  reset();
  setNow('STARTING', true);
  const res = await fetch('/api/run', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ langs: LANG_IDS, warmup: 2 }),
  });
  if (!res.ok) {
    setRunning(false);
    setNow('READY', false);
    footEnv.textContent = en((await res.json()).error).slice(0, 60).toUpperCase();
    footEnv.dataset.bad = '1';
  }
};

boot();
