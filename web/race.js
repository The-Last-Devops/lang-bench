// Màn hình đua dọc 9:16. Điểm được cộng ngay khi từng phép đo về từ runner,
// không chờ hết lượt chạy.
// The vertical 9:16 race screen. Points land the moment each measurement
// arrives from the runner — nothing waits for the run to finish.

// Danh sách ngôn ngữ đến từ server (/api/languages), không viết cứng ở đây: mỗi service
// trong docker-compose là một hàng trên màn hình, kể cả phiên bản thứ hai của cùng ngôn ngữ.
// Bảng dưới chỉ là dự phòng khi chưa gọi được server.
// The language list comes from the server (/api/languages) rather than living here: each
// docker-compose service is a row on screen, second versions of a language included. The
// table below is only the fallback for before the server answers.
let LANGS = [
  { id: 'cpp', label: 'C++', color: '#4C8DFF' },
  { id: 'rust', label: 'Rust', color: '#F2703C' },
  { id: 'go', label: 'Go', color: '#2FCBDE' },
  { id: 'node', label: 'Node', color: '#8FD14F' },
];
let LANG_IDS = LANGS.map((l) => l.id);

/* Bảng màu này là của MÀN HÌNH, không lấy từ registry: registry mang màu của dashboard cũ,
   chọn cho nền sáng và đọc rất kém trên nền tối ở đây.
   Ngôn ngữ registry chưa biết — node20 chẳng hạn — nhận màu dẫn xuất từ ngôn ngữ gốc, làm
   sáng lên để phân biệt được. Trùng màu hệt nhau thì hai hàng thành một khối không đọc nổi.
   This palette belongs to the SCREEN, not to the registry: the registry carries the old
   dashboard's colours, picked for a light ground and barely legible on this dark one.
   A language the registry has not seen — node20, say — takes a shade derived from its base,
   lightened so the two can be told apart; identical colours would fuse two rows into one. */
// C++ xanh dương, Rust cam, Go cyan — nên khoảng màu còn trống cho Node là xanh lá đến
// vàng. Ba phiên bản Node lấy ba sắc TÁCH BIỆT trong khoảng đó, không phải ba mức đậm nhạt
// của cùng một màu: đậm nhạt thì ở cỡ thumbnail và trên clip nén sẽ nhìn ra một khối.
// C++ takes blue, Rust orange, Go cyan, which leaves green through yellow for Node. The
// three Node versions take three SEPARATE hues in that range rather than three tints of one
// colour: tints fuse into a single block at thumbnail size and through video compression.
/* BỘ MÀU cố định, chọn sẵn cho nền tối.
 *
 * IDENTITY giữ màu nhận diện của các ngôn ngữ gốc — người xem đã quen C++ xanh dương, Rust
 * cam. RAMP dành cho mọi thứ còn lại (node26, node24, …), gán theo THỨ TỰ xuất hiện nên bao
 * nhiêu ngôn ngữ cũng luôn được màu tách bạch.
 *
 * Các màu trong RAMP cách xa nhau về SẮC, không phải về đậm nhạt. Lần trước tôi cho ba bản
 * Node ba mức xanh–vàng và chúng dính vào nhau; qua nén video và ở cỡ thumbnail thì hai màu
 * gần nhau đọc ra làm một.
 *
 * A fixed PALETTE, chosen for the dark ground.
 *
 * IDENTITY keeps the base languages' recognisable colours — viewers already read C++ as blue
 * and Rust as orange. RAMP covers everything else (node26, node24, ...), assigned in ORDER of
 * appearance, so any number of languages still comes out distinguishable.
 *
 * RAMP's colours are separated by HUE, not by lightness. The three Node versions were first
 * given three green-to-yellow tints and they merged: through video compression and at
 * thumbnail size, neighbouring colours read as one.
 */
const IDENTITY = {
  cpp: '#4C8DFF', rust: '#F2703C', go: '#2FCBDE', node: '#8FD14F',
  java: '#E0605F', php: '#9B8CFF', python: '#FFC94D', ruby: '#FF6B9D',
};
const RAMP = [
  '#4ED17A', // xanh lá
  '#FF9F45', // cam
  '#B98CFF', // tím
  '#37C5E8', // cyan
  '#FF6B9D', // hồng
  '#E8D44D', // vàng
  '#7C9BFF', // xanh tím
  '#4ECDB0', // ngọc
];

function lighten(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return '#' + [mix(n >> 16), mix((n >> 8) & 255), mix(n & 255)]
    .map((v) => v.toString(16).padStart(2, '0')).join('');
}

function assignColors(list) {
  let next = 0;
  return list.map((l) => IDENTITY[l.id] ?? RAMP[next++ % RAMP.length]);
}

// 'node26' → 'Node 26'; 'Node.js' → 'Node'. Tên dài làm hàng bị chật, mà cỡ chữ rất lớn.
// 'node26' -> 'Node 26'; 'Node.js' -> 'Node'. Long names crowd the row, and the type is large.
function shortLabel(l) {
  const m = /^([a-z+]+?)(\d+)$/.exec(l.id);
  if (m) return cap(m[1]) + ' ' + m[2];
  if (l.id === 'node') return 'Node';
  return (l.name || l.id).replace(/\.js$/, '');
}
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);

const $ = (id) => document.getElementById(id);
const stage = $('stage'), wins = $('wins'), board = $('board');
const nowName = $('nowName'), nowMs = $('nowMs'), footEnv = $('footEnv'), go = $('go'), clock = $('clock');
const clr = $('clr'), tip = $('tip'), gate = $('gate'), gateLangs = $('gateLangs');
const gateLead = $('gateLead');
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
/* Tiếng điểm tăng. Bản cũ là sóng vuông 180–220Hz lặp mỗi 55ms: sóng vuông nhiều hài bậc
   cao nên rè, quãng trầm lại lặp dày, nghe một phút là mệt tai.
   Giờ dùng thang NGŨ CUNG — thang này không chứa quãng nghịch, nên phát nốt theo bất kỳ
   thứ tự nào cũng không bao giờ chỏi, kể cả khi bốn ngôn ngữ cùng ăn điểm dồn dập. Nốt đi
   lên dần rồi vòng lại, cho cảm giác leo thang thay vì gõ đều một chỗ. Sóng sin, nhỏ, tắt mềm.

   The points-climbing sound. It used to be a 180-220Hz square wave every 55ms: square waves
   are rich in high harmonics and buzz, and a low note repeating that densely wears the ear
   out within a minute.
   Now it walks a PENTATONIC scale — a scale with no dissonant intervals, so notes can land
   in any order and never clash, even when all four languages score at once. They climb and
   wrap, which reads as ascending rather than tapping one spot. Sine, quiet, soft release. */
const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
let tickStep = 0;
const sfxTick = () => {
  const f = PENTA[tickStep % PENTA.length];
  tickStep += 1;
  beep({ freq: f, dur: 0.11, type: 'sine', gain: 0.05 });
  // Quãng tám trên rất khẽ: thêm chút lấp lánh chứ không thành nốt thứ hai.
  // A very quiet octave above: sparkle on the note, not a second note.
  beep({ freq: f * 2, dur: 0.07, type: 'sine', gain: 0.014 });
};
const sfxBlip = () => beep({ freq: 660, dur: 0.07, type: 'sine', gain: 0.16 });
// Tiếng bấm Run: hai nốt đi lên, dứt khoát — báo lượt chạy đã bắt đầu thật, vì sau cú
// bấm là vài giây build im lìm chưa có gì để nhìn.
// The Run press: two rising notes, decisive — it confirms the run really started, since
// the click is followed by seconds of quiet building with nothing yet to see.
function sfxStart() {
  [523.3, 784].forEach((f, i) =>
    beep({ freq: f, dur: 0.16, type: 'triangle', gain: 0.26, delay: i * 0.07 }));
}

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
const provMs = {};                // provMs[langId] = {bench, ms} của bài đang đo dở
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
let winEls = [], rows = [];
let running = false, dead = new Set();
let startedAt = 0, elapsedMs = 0;   // đồng hồ giây cạnh nút Run / the seconds clock beside Run

for (const l of LANGS) {
  target[l.id] = 0; provMs[l.id] = null; buf[l.id] = []; shown[l.id] = 0;
  dGain[l.id] = dGainTo[l.id] = dMs[l.id] = dMsTo[l.id] = 0; dRatio[l.id] = '';
  twScore[l.id] = tween(); twGain[l.id] = tween(); twMs[l.id] = tween();
}

/* ── dựng khung xương một lần, sau khi biết có bao nhiêu bài test ── */
function build() {
  const cols = 'repeat(' + benches.length + ',1fr)';
  wins.style.gridTemplateColumns = cols;

  winEls = benches.map((id, i) => {
    const d = document.createElement('div');
    d.className = 'win';
    d.addEventListener('pointerenter', () => showTip(i, d));
    d.addEventListener('pointerleave', hideTip);
    wins.appendChild(d);
    return d;
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

/* ── bảng chi tiết khi rê chuột lên một ô thắng ── */

// Toạ độ tính trong hệ của CHÍNH stage, không dùng toạ độ màn hình: stage đang bị transform
// scale để vừa khung nhìn, nên getBoundingClientRect trả về pixel đã thu nhỏ và đặt bảng
// theo đó sẽ lệch đúng bằng tỉ lệ thu phóng.
// Positions are computed in the stage's OWN coordinate system, never screen coordinates:
// the stage is transform-scaled to fit, so getBoundingClientRect returns shrunken pixels
// and placing the panel by them would be off by exactly the zoom factor.
function showTip(i, el) {
  const id = benches[i];
  const p = pts[id] || {};
  const m = mid[id] || {};
  const f = failed[id] || {};
  if (!Object.keys(p).length && !Object.keys(f).length) return;

  const best = Math.max(...LANGS.map((l) => p[l.id] ?? -1));
  const rows = LANGS.map((l) => {
    const isWin = p[l.id] !== undefined && p[l.id] === best;
    const score = f[l.id] ? 'FAIL' : p[l.id] !== undefined ? fmt(p[l.id]) : '—';
    const ms = f[l.id] ? '' : m[l.id] !== undefined ? m[l.id].toFixed(1) + ' ms' : '';
    return '<tr data-win="' + (isWin ? '1' : '0') + '">' +
      '<td class="c"><i style="background:' + l.color + '"></i></td>' +
      '<td class="n">' + l.label.toUpperCase() + '</td>' +
      '<td class="p">' + score + '</td>' +
      '<td class="m">' + ms + '</td></tr>';
  }).join('');

  const ref = refMs[id] ? '<em>' + refMs[id].toFixed(1) + ' ms = 1000</em>' : '';
  tip.innerHTML = '<h4>' + id.toUpperCase() + ' ' + ref + '</h4><table>' + rows + '</table>';
  tip.hidden = false;

  // Neo vào giữa ô, nằm trên dải chấm, kẹp trong lề của stage.
  // Anchored to the square's centre, above the strip, clamped inside the stage padding.
  const pad = 72;
  const cx = wins.offsetLeft + el.offsetLeft + el.offsetWidth / 2;
  const w = tip.offsetWidth;
  let left = cx - w / 2;
  left = Math.max(pad, Math.min(left, stage.clientWidth - pad - w));
  tip.style.left = left + 'px';
  tip.style.top = (wins.offsetTop - tip.offsetHeight - 18) + 'px';
}

function hideTip() { tip.hidden = true; }

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
    if (tweenStep(twScore[id], now)) moving = true;
    shown[id] = twScore[id].v;
    // Còn điểm CHƯA giao xong thì coi là đang leo — không hỏi frame này nhích bao nhiêu.
    // Ngưỡng cũ 0.5/frame làm mọi lượt cộng nhỏ bị câm: tween kéo 820ms ≈ 50 frame, nên
    // +20 điểm chỉ nhích 0.4 mỗi frame và không bao giờ chạm ngưỡng.
    // Climbing means points are still undelivered — never how far this frame moved. The old
    // 0.5-per-frame threshold silenced every small gain: the tween runs 820ms ≈ 50 frames,
    // so +20 points moves 0.4 a frame and never reaches it.
    if (target[id] - shown[id] > 0.01) climbing = true;
    tweenStep(twGain[id], now); dGain[id] = twGain[id].v;
    tweenStep(twMs[id], now);   dMs[id] = twMs[id].v;
  }

  // Đang leo thì rải tiếng đều theo thời gian, bất kể leo nhanh hay chậm.
  // While climbing, ticks are spaced by time — the same whether the climb is fast or slow.
  if (sound && climbing && now - lastTick > 90) { lastTick = now; sfxTick(); }

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
  const [registry, reference, langs] = await Promise.all([
    fetch('/api/registry').then((r) => r.json()),
    fetch('/api/reference').then((r) => r.json()),
    fetch('/api/languages').then((r) => r.json()).catch(() => null),
  ]);
  if (langs?.languages?.length) {
    const colors = assignColors(langs.languages);
    LANGS = langs.languages.map((l, i) => ({ id: l.id, label: shortLabel(l), color: colors[i], v: version(l.version) }));
    LANG_IDS = LANGS.map((l) => l.id);
    for (const l of LANGS) {
      target[l.id] = 0; provMs[l.id] = null; buf[l.id] = []; shown[l.id] = 0;
      dGain[l.id] = dGainTo[l.id] = dMs[l.id] = dMsTo[l.id] = 0; dRatio[l.id] = '';
      twScore[l.id] = tween(0); twGain[l.id] = tween(0); twMs[l.id] = tween(0);
    }
  }
  benches = registry.benchmarks.map((b) => b.id);
  // Số bài lấy từ registry chứ không viết cứng: thêm bài là câu này tự đúng theo.
  // The count comes from the registry, never hard-coded: add a benchmark and it follows.
  gateLead.textContent =
    `Bài kiểm tra hiệu năng của ${LANGS.length} ngôn ngữ lập trình, qua ${benches.length} bài test.`;
  refMs = reference.refMs;
  build();

  fillGateLangs();
  fetch('/api/host').then((r) => r.json()).then(({ host }) => {
    const cores = langs?.languages?.[0]?.cores ?? host.usableCores;
    footEnv.textContent = [host.env, cores + ' cores', host.arch].join(' · ').toUpperCase();
  }).catch(() => {});

  updateClear();
  const status = await fetch('/api/status').then((r) => r.json());
  if (status.running && (!ac || ac.state !== 'running')) showHint(true);
  setRunning(status.running);
  // F5 giữa lượt chạy thì đừng che kết quả đang chạy bằng popup.
  // Reloading mid-run must not cover the live results with the panel.
  setGate(!status.running);
  connect();
  requestAnimationFrame(tick);
}

// Nút Xoá chỉ có nghĩa khi màn hình đang mang dữ liệu — điểm đã lên, hoặc lượt chạy đã đi
// được vài phép đo. Sau F5 giữa lượt chạy thì điều kiện này vẫn đúng, nên nút vẫn có mặt.
// Clear only means anything while the screen carries data — points on the board, or a run
// some measurements in. That still holds after a reload mid-run, so the button is there.
// Một nút, hai việc, theo trạng thái: đang chạy thì là STOP, rảnh thì là CLEAR.
//
// Luôn hiện. Bản trước ẩn nó khi màn hình chưa có dữ liệu, nhưng điều kiện đó chỉ được
// soát lại ở vài thời điểm nhất định, nên có lúc nút xuất hiện muộn và phải F5 mới thấy.
// Một nút cố định ở một chỗ cố định thì không bao giờ sai — và Clear lúc màn hình đã sạch
// cũng chẳng hại gì.
//
// One button, two jobs by state: STOP while running, CLEAR while idle.
//
// Always visible. It used to hide when the screen held no data, but that condition was
// only re-checked at certain moments, so the button could show up late and take a reload
// to appear. A button that is always in the same place cannot get this wrong — and Clear
// on an already-clean screen does no harm.
function updateClear() {
  clr.textContent = running ? 'Stop' : 'Clear';
  clr.dataset.stop = running ? '1' : '0';
}

// Popup là cửa vào duy nhất: mở khi màn hình đang rảnh, đóng suốt lượt chạy, Clear thì mở
// lại. Vòng lặp là popup → chạy → kết quả → Clear → popup.
// The panel is the only way in: open while the screen is idle, closed for the whole run,
// reopened by Clear. The loop is panel → run → results → Clear → panel.
function setGate(on) {
  gate.hidden = !on;
}

// Dựng bảng màu từ chính LANGS, không viết cứng trong HTML: thêm hay bỏ một ngôn ngữ thì
// bảng màu tự đúng theo, không có chỗ nào để lệch.
// The legend is built from LANGS rather than written into the HTML: add or drop a language
// and it follows automatically, with nowhere left to fall out of sync.
function fillGateLangs() {
  gateLangs.innerHTML = LANGS.map((l) =>
    '<div><i style="background:' + l.color + '"></i>' + l.label +
    (l.v ? '<b>' + l.v + '</b>' : '') + '</div>'
  ).join('');
}

// Lấy đúng số phiên bản khỏi dòng --version. Mỗi toolchain in một kiểu khác nhau, nhưng
// số phiên bản luôn là chuỗi số-chấm-số đầu tiên, nên một biểu thức là đủ cho cả bốn.
// Pull the version number out of a --version line. Every toolchain prints a different
// shape, but the version is always the first digit-dot-digit run, so one pattern covers all.
function version(line) {
  const m = /(\d+\.\d+(?:\.\d+)?)/.exec(line || '');
  return m ? m[1] : '';
}

function setRunning(on) {
  // Bắt đầu thì khởi động đồng hồ; dừng thì giữ nguyên số cuối cùng.
  // Starting resets the clock; stopping freezes it on the final figure.
  if (on && !running) startedAt = Date.now();
  if (!on) startedAt = 0;
  running = on;
  go.disabled = on;
  updateClear();
  go.textContent = on ? 'Running' : 'Run';
}

function reset() {
  dead = new Set();
  elapsedMs = 0;
  startedAt = running ? Date.now() : 0;
  for (const id of LANG_IDS) {
    target[id] = 0; provMs[id] = null; buf[id] = []; shown[id] = 0;
    tweenSet(twScore[id], 0); tweenSet(twGain[id], 0); tweenSet(twMs[id], 0);
  }
  for (const k of Object.keys(pts)) delete pts[k];
  for (const k of Object.keys(mid)) delete mid[k];
  for (const k of Object.keys(failed)) delete failed[k];
  doneCount = 0; totalCount = 0;
  noteUntil = 0;
  tickStep = 0;
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
  winEls.forEach((el) => { el.style.background = ''; el.style.transform = ''; el.style.opacity = ''; delete el.dataset.new; });
  hideTip();
  rows.forEach((r) => { r.delta.style.opacity = 0; r.delta.textContent = ''; });
  nowMs.textContent = '';
  draw(); layout();
  updateClear();
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
// Cắt cho vừa hàng, giữ nguyên phần đầu vì đó là phần mang thông tin.
// Bounded to fit the row, keeping the head of the string where the meaning is.
function clip(text, max) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

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

/**
 * Mốc dùng để chấm điểm một bài.
 *
 * Có trong reference.json thì dùng — đó là mốc cố định, giữ cho điểm so sánh được giữa
 * các lượt chạy và giữa các máy. CHƯA có thì suy ra từ chính lượt chạy này: lấy median
 * nhanh nhất trong các ngôn ngữ, đúng cách 12 mốc gốc đã được tạo ra.
 *
 * Nhờ vậy MỌI bài đã chạy đều được tính điểm. Trước đây thiếu mốc là bài đó bị bỏ qua
 * lặng lẽ — chạy tốn thời gian thật mà không đóng góp gì vào bảng.
 *
 * The reference a benchmark is scored against.
 *
 * Use reference.json when it has one: that fixed mark is what keeps scores comparable
 * across runs and machines. When it does not, derive one from this run — the fastest
 * median across the languages, exactly how the original twelve marks were produced.
 *
 * So EVERY benchmark that runs is scored. A missing mark used to make a benchmark skip
 * silently: it cost real time and contributed nothing to the board.
 */
function refFor(bench) {
  if (refMs[bench]) return refMs[bench];
  const seen = Object.values(mid[bench] || {});
  return seen.length ? Math.min(...seen) : 0;
}

// Điểm chốt luôn được dựng LẠI từ các median đã đo, không cộng dồn.
// Một mốc suy ra sẽ giảm dần khi có ngôn ngữ nhanh hơn báo về, và mọi điểm đã trao cho
// bài đó phải đổi theo — cộng dồn thì không sửa lại được.
// Settled points are always REBUILT from the medians, never accumulated.
// A derived mark drops as faster languages report, and every point already awarded for
// that benchmark has to move with it — an accumulated total could not be corrected.
/**
 * Điểm tổng = TỔNG của (1000 × mốc / median) trên các bài đã đo.
 *
 * Từng thử trung bình nhân — đúng hơn về thống kê, và thứ hạng không phụ thuộc việc chọn
 * mốc nào. Nhưng trung bình nhân là một giá trị TRUNG BÌNH: bài nào một ngôn ngữ làm tệ
 * hơn mức trung bình của chính nó sẽ kéo trung bình xuống, nên điểm tụt ngay giữa lượt
 * chạy. Trên màn hình đua thì đó là điều không giải thích nổi.
 *
 * Vấn đề trọng số thật ra nằm ở MỐC, không ở phép cộng: khi mốc được đo đúng thì mốc chính
 * là median nhanh nhất, mọi tỉ lệ nằm trong 0–1, mỗi bài đóng góp nhiều nhất 1000 điểm, và
 * phép cộng tự khắc cân. `file-io` từng cho cả bốn ngôn ngữ trên 1000 điểm — đó là mốc sai,
 * không phải phép cộng sai.
 *
 * Overall = the SUM of (1000 x mark / median) over the benchmarks measured.
 *
 * A geometric mean was tried — more defensible statistically, and its ranking does not
 * depend on which reference was chosen. But a geometric mean is an AVERAGE: a benchmark a
 * language handles worse than its own average drags that average down, so the score falls
 * mid-run. On a race screen that is unexplainable.
 *
 * The weighting problem was really in the MARKS, not the addition: with marks measured
 * properly the mark IS the fastest median, every ratio lands in 0-1, each benchmark
 * contributes at most 1000, and the sum balances itself. `file-io` handing all four
 * languages over 1000 points was a wrong mark, not wrong arithmetic.
 */
function totalFor(lang) {
  let sum = 0;
  for (const bench of Object.keys(mid)) {
    const ref = refFor(bench);
    const ms = mid[bench][lang];
    if (ref && ms > 0) sum += Math.round(1000 * ref / ms);
  }
  // Bài đang đo dở góp điểm tạm, để số nhích ngay chứ không đứng im tới cuối bài.
  // The in-flight benchmark contributes provisionally, so the score moves now.
  const p = provMs[lang];
  if (p && !(mid[p.bench] && mid[p.bench][lang])) {
    const ref = refFor(p.bench);
    if (ref && p.ms > 0) sum += Math.round(1000 * ref / p.ms);
  }
  return sum;
}

function rescore() {
  // pts giữ điểm RIÊNG của từng bài (vẫn là 1000 × mốc/median) — dùng để chấm người thắng
  // bài đó và dựng bảng chi tiết. Nó độc lập với cách gộp tổng.
  // pts keeps each benchmark's OWN score (still 1000 x mark/median) for picking that
  // benchmark's winner and building the detail panel. It is independent of how totals combine.
  for (const bench of Object.keys(mid)) {
    const ref = refFor(bench);
    if (!ref) continue;
    for (const [lang, ms] of Object.entries(mid[bench])) {
      (pts[bench] ??= {})[lang] = Math.round(1000 * ref / ms);
    }
  }
  for (const id of LANG_IDS) {
    target[id] = totalFor(id);
    tweenTo(twScore[id], target[id], TW_SCORE);
  }
}

function onMeasurement(e) {
  const { benchmark, language, stats } = e;
  if (!LANG_IDS.includes(language)) return;

  const row = rows.find((r) => r.id === language);
  if (!stats.ok) {
    (failed[benchmark] ??= {})[language] = stats.error ?? 'lỗi';
    // Bỏ điểm tạm của bài hỏng, nếu không nó dính lại vĩnh viễn.
    // Drop the failed benchmark's provisional points, or they stick forever.
    provMs[language] = null;
    buf[language] = [];
    target[language] = totalFor(language);
    tweenTo(twScore[language], target[language], TW_SCORE);
    dead.add(language);
    if (row) { row.delta.style.opacity = 1; row.delta.textContent = 'FAIL'; }
    return;
  }

  updateClear();
  // Điểm "ăn được" giờ là mức TỔNG dịch chuyển, không còn là điểm riêng của bài — với
  // trung bình nhân, một bài không cộng thêm một lượng cố định mà kéo cả trung bình.
  // The gain is now how far the TOTAL moved, not the benchmark's own score: under a
  // geometric mean a benchmark does not add a fixed amount, it pulls the whole mean.
  const before = totalFor(language);
  (mid[benchmark] ??= {})[language] = stats.median;
  provMs[language] = null;
  buf[language] = [];
  rescore();
  const gained = totalFor(language) - before;
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
      // Dòng lệnh build dài hơn bề ngang hàng, nên cắt tại đây — CSS không còn cắt nữa.
      // Build commands outrun the row, so they are bounded here: CSS no longer clips.
      setStat(e.lang, clip(en(raw), 26));
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
      // Mốc của bài đang chạy: đây chính là thời gian ứng với 1000 điểm. Đứng yên suốt
      // bài nên đọc được, khác hẳn con số ms nhảy loạn trước đây.
      // The current benchmark's reference: the time 1000 points is worth. It holds still
      // for the whole benchmark, unlike the ms figure that used to flicker here.
      nowMs.textContent = refMs[e.benchmark] ? refMs[e.benchmark].toFixed(1) + ' MS = 1000' : '';
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
      setStat(e.language, e.ms.toFixed(1) + ' <u>ms</u>');
      if (!LANG_IDS.includes(e.language) || !refFor(e.benchmark)) break;
      buf[e.language].push(e.ms);
      const q = [...buf[e.language]].sort((a, b) => a - b);
      const m = q.length % 2 ? q[(q.length - 1) / 2] : (q[q.length / 2 - 1] + q[q.length / 2]) / 2;
      provMs[e.language] = { bench: e.benchmark, ms: m };
      target[e.language] = totalFor(e.language);
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
      updateClear();
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

// Xoá đưa màn hình về đúng trạng thái mở lần đầu, rồi tự ẩn đi.
// Clear returns the screen to exactly how it opens, then hides itself.
clr.onclick = async () => {
  armAudio();

  // Đang chạy: dừng thật, giữ nguyên kết quả đã đo trên màn hình. Không xoá — người ta
  // bấm Stop là để xem cái đang có, chứ không phải để mất nó.
  // Running: really stop, and leave the measured results on screen. Nothing is cleared —
  // Stop is pressed to keep what is there, not to lose it.
  if (running) {
    const res = await fetch('/api/stop', { method: 'POST' });
    if (!res.ok) setRunning(false);
    return;
  }

  reset();
  setNow('READY', false);
  setSub('', '', false);
  nowMs.textContent = '';
  updateClear();
  setGate(true);
  // Xoá cả nhật ký phát lại trên server, nếu không F5 sẽ dựng lại đúng bảng điểm vừa xoá.
  // Clear the server's replay log too, or a reload rebuilds the board that was just cleared.
  fetch('/api/clear', { method: 'POST' }).catch(() => {});
};

go.onclick = async () => {
  if (running) return;
  armAudio();
  sfxStart();
  setGate(false);
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
    setGate(true);
    setNow('READY', false);
    footEnv.textContent = en((await res.json()).error).slice(0, 60).toUpperCase();
    footEnv.dataset.bad = '1';
  }
};

boot();
