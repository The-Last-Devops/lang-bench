// Phần dùng chung giữa màn hình đua (race.html) và trang cover (cover.html): danh sách
// ngôn ngữ, bộ màu, cách viết tên, và hai câu chữ mở đầu.
//
// Hai trang phải nói CÙNG một điều: cover là ảnh đầu clip, màn hình đua là nội dung clip.
// Cover ghi "4 ngôn ngữ" màu C++/Rust/Go/Node trong khi clip đua Node/PHP/Python là sai
// ngay từ khung hình đầu — mà lỗi đó không có gì báo, vì hai file viết cứng hai bảng khác
// nhau. Nên bảng chỉ được tồn tại MỘT chỗ, và cả hai trang đọc từ đây.
//
// Shared between the race screen (race.html) and the cover page (cover.html): the language
// list, the palette, how names are written, and the two opening sentences.
//
// The two pages must say the SAME thing: the cover is the clip's first frame, the race is
// the clip. A cover reading "4 languages" in C++/Rust/Go/Node colours over a clip racing
// Node/PHP/Python is wrong from frame one — and nothing catches it, because the two files
// hard-code two different tables. So the table lives in ONE place and both pages read it.

// Dự phòng khi chưa gọi được server. / The fallback for before the server answers.
const FALLBACK_LANGS = [
  { id: 'cpp', label: 'C++', color: '#4C8DFF', v: '' },
  { id: 'rust', label: 'Rust', color: '#F2703C', v: '' },
  { id: 'go', label: 'Go', color: '#2FCBDE', v: '' },
  { id: 'node', label: 'Node', color: '#8FD14F', v: '' },
];

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
// Pascal lấy màu ngọc: đó là khoảng trống cuối cùng giữa cyan của Go và xanh lá của Node.
// Đây cũng là cặp gần nhau nhất trong bảng — Go và Pascal cùng đua thì nhìn kỹ mới tách được.
// Pascal takes teal, the last gap left between Go's cyan and Node's green. It is also the
// closest pair in the table: racing Go and Pascal together takes a second look to tell apart.
const IDENTITY = {
  cpp: '#4C8DFF', rust: '#F2703C', go: '#2FCBDE', node: '#8FD14F',
  java: '#E0605F', php: '#9B8CFF', python: '#FFC94D', ruby: '#FF6B9D',
  pascal: '#1FBFA4',
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

// Lấy đúng số phiên bản khỏi dòng --version. Mỗi toolchain in một kiểu khác nhau, nhưng
// số phiên bản luôn là chuỗi số-chấm-số đầu tiên, nên một biểu thức là đủ cho cả bốn.
// Pull the version number out of a --version line. Every toolchain prints a different
// shape, but the version is always the first digit-dot-digit run, so one pattern covers all.
function version(line) {
  const m = /(\d+\.\d+(?:\.\d+)?)/.exec(line || '');
  return m ? m[1] : '';
}

// Đổi câu trả lời của /api/languages thành đúng dạng hai trang cùng dùng.
// Turn /api/languages' answer into the one shape both pages use.
function buildLangs(list) {
  const colors = assignColors(list);
  return list.map((l, i) => ({
    id: l.id, label: shortLabel(l), color: colors[i], v: version(l.version),
  }));
}

// Ngôn ngữ nào đang chạy do LB_AGENTS trong docker-compose quyết định, nên phải HỎI server;
// không trang nào được tự đoán.
// Which languages are running is decided by LB_AGENTS in docker-compose, so the server has
// to be ASKED; neither page may guess.
async function fetchLangs() {
  try {
    const r = await fetch('/api/languages');
    const j = await r.json();
    return j?.languages?.length ? buildLangs(j.languages) : FALLBACK_LANGS;
  } catch {
    return FALLBACK_LANGS;
  }
}

/**
 * Câu mở đầu phải nói đúng thứ đang được đo.
 *
 * Bốn phiên bản Node là MỘT ngôn ngữ, không phải bốn — gọi là "4 ngôn ngữ lập trình" thì sai
 * hẳn, và người xem biết chút ít sẽ nhận ra ngay. Đếm theo ngôn ngữ GỐC (bỏ số phiên bản ở
 * cuối id), rồi chọn câu theo đúng tình huống.
 *
 * The opening line has to name what is actually being measured.
 *
 * Four Node versions are ONE language, not four; calling that "4 programming languages" is
 * simply wrong, and any viewer who knows a little will catch it. Count by BASE language —
 * the id with its version digits removed — and pick the wording that fits.
 */
// Đang chạy nhiều phiên bản của MỘT ngôn ngữ hay nhiều ngôn ngữ khác nhau.
// Whether this is several versions of ONE language, or several different languages.
const baseIds = (langs) => [...new Set(langs.map((l) => l.id.replace(/\d+$/, '')))];

const BASE_NAME = { cpp: 'C++', rust: 'Rust', go: 'Go', node: 'Node.js', java: 'Java', php: 'PHP', python: 'Python', ruby: 'Ruby', pascal: 'Pascal' };

/**
 * Câu cảnh báo phải gọi đúng tên thứ đang so.
 *
 * Ghép cứng "ngôn ngữ / phiên bản" thì đọc lủng củng, mà để nguyên "ngôn ngữ" thì sai khi
 * đang chạy bốn bản Node. Đổi đúng một từ theo tình huống là gọn nhất, và câu vẫn trôi.
 *
 * The caveat has to name what is actually being compared.
 *
 * Writing "language / version" everywhere reads badly, and leaving it as "language" is wrong
 * while four Node versions are running. Swapping the single word to fit is the tidiest fix,
 * and the sentence still reads.
 */
function caveatLine(langs) {
  const word = baseIds(langs).length === 1 && langs.length > 1 ? 'Phiên bản' : 'Ngôn ngữ';
  return `Kết quả chỉ để tham khảo. ${word} thắng ở đây không có nghĩa là nó sẽ nhanh hơn `
    + 'trong dự án của bạn — điều đó còn tuỳ vào công việc cụ thể, cách bạn viết code, '
    + 'thư viện bạn dùng và môi trường thực thi.';
}

function leadLine(langs, benchCount) {
  const bases = baseIds(langs);
  const tail = `, qua ${benchCount} bài test.`;
  if (bases.length === 1 && langs.length > 1) {
    const name = BASE_NAME[bases[0]] ?? cap(bases[0]);
    return `Bài kiểm tra hiệu năng của ${langs.length} phiên bản ${name}${tail}`;
  }
  if (bases.length === langs.length) {
    return `Bài kiểm tra hiệu năng của ${langs.length} ngôn ngữ lập trình${tail}`;
  }
  // Vừa nhiều ngôn ngữ vừa nhiều phiên bản: phải nói cả hai con số.
  // Several languages and several versions at once: both numbers have to be said.
  return `Bài kiểm tra hiệu năng của ${bases.length} ngôn ngữ lập trình, ${langs.length} phiên bản${tail}`;
}

// Tiêu đề cover phải gọi đúng thứ đang so, giống hệt câu mở đầu của màn hình đua — nhưng
// vẽ trên canvas nên phải ngắt sẵn thành ba dòng.
// The cover title has to name the same thing the race screen's opening sentence does — but
// it is drawn on canvas, so it comes pre-broken into three lines.
function coverTitle(langs) {
  const bases = baseIds(langs);
  if (bases.length === 1 && langs.length > 1) {
    return ['Bài test', 'hiệu năng', (BASE_NAME[bases[0]] ?? cap(bases[0]))];
  }
  return ['Bài test', 'hiệu năng', 'ngôn ngữ'];
}
