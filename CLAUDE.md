# lang-bench

Bộ benchmark tự viết so sánh hiệu năng nhiều ngôn ngữ. Mỗi bài test được viết tay cho **mọi**
ngôn ngữ trong `benchmarks/registry.json`, và kết quả chỉ được tính khi tất cả cho ra cùng một
checksum.

Hand-written benchmarks comparing languages. Every benchmark is written by hand for **every**
language in `benchmarks/registry.json`, and a result counts only when they all produce the same
checksum.

---

## Luật 1 — Thêm bài test là phải viết cho TẤT CẢ ngôn ngữ và phiên bản

Một bài test chỉ được `benchmarks/registry.json` ghi nhận khi đã có bản cho **mọi** ngôn ngữ:

| Ngôn ngữ | File |
|---|---|
| C++ | `<bài>/main.cpp` |
| Rust | `<bài>/main.rs` + một mục `[[bin]]` trong `benchmarks/Cargo.toml` |
| Go | `<bài>/go/main.go` — thư mục riêng vì Go từ chối thư mục có lẫn `.cpp` |
| Node | `<bài>/main.js` |
| Java | `<bài>/Main.java` |
| PHP | `<bài>/main.php` |
| Python | `<bài>/main.py` |
| Ruby | `<bài>/main.rb` |
| Pascal | `<bài>/main.pas` — dùng unit `_common/common.pas` |

**Vì sao đây là luật, không phải lời khuyên:** thiếu một file thì phép đo của ngôn ngữ đó *hỏng*,
và màn hình đua đánh dấu ngôn ngữ đó là "chết" rồi **ngừng tính điểm vĩnh viễn** từ bài đó trở đi.
Một file thiếu ở bài thứ tư làm mất trắng cả bốn ngôn ngữ trong 14 bài còn lại.

Chuyện này đã xảy ra thật: `dijkstra`, `sort-objects`, `binary-trees`, `utf8`, `base64`,
`string-build` từng chỉ được viết cho bốn ngôn ngữ đang đua, để lại 24 file thiếu và làm PHP,
Python, Java, Ruby không chạy nổi.

Kiểm tra trước khi đăng ký một bài mới:

```bash
node -e "
const fs=require('fs'), r=require('./benchmarks/registry.json');
const F={cpp:'main.cpp',rust:'main.rs',go:'go/main.go',node:'main.js',
         java:'Main.java',php:'main.php',python:'main.py',ruby:'main.rb',
         pascal:'main.pas'};
for (const b of r.benchmarks)
  for (const [l,f] of Object.entries(F))
    if (!fs.existsSync('benchmarks/'+b.id+'/'+f)) console.log('THIẾU', b.id, l);
"
```

## Luật 1b — Thêm hoặc sửa bài test là phải cập nhật `benchmarks/guides.json`

Dấu `?` ở thẻ **Chi tiết** (tab Kết quả) mở popup giải thích bài test cho người xem: đo cái gì,
chương trình làm gì theo từng bước, checksum lấy từ đâu, và đọc con số thế nào cho đúng. Toàn bộ
nội dung đó nằm ở `benchmarks/guides.json`, khoá theo `id` của bài, mỗi bài có bản `vi` và `en`:

```json
"fib": { "vi": { "what": "…", "how": ["…"], "checksum": "…", "watch": ["…"] }, "en": { … } }
```

Server đọc file này mỗi lần gọi `/api/guides`, nên **sửa xong là màn hình đổi ngay** — không cần
chạy lại benchmark, không cần khởi động lại server. Nhóm/số lần chạy/metric/tham số trong popup
lấy tự động từ `registry.json`, không khai lại ở đây.

**Vì sao là luật:** hướng dẫn nói sai còn tệ hơn không có, vì người xem tin nó. Sửa tham số, đổi
thuật toán, chuyển phần việc ra/vào trong `Timer` — tất cả đều làm phần `how` hoặc `checksum` sai
sự thật. Thêm bài mới mà quên thì popup chỉ hiện dòng "chưa có hướng dẫn".

```bash
node -e "
const g=require('./benchmarks/guides.json').guides, r=require('./benchmarks/registry.json');
const ids=r.benchmarks.map(b=>b.id), k=Object.keys(g);
console.log('THIẾU', ids.filter(i=>!k.includes(i)), '· THỪA', k.filter(i=>!ids.includes(i)));
for (const [id,e] of Object.entries(g))
  for (const l of ['vi','en'])
    if (!e[l]?.what || !e[l]?.how?.length) console.log('SƠ SÀI', id, l);
"
```

## Luật 2 — Không dùng thư viện cho phần việc đang được đo

Gọi vào thư viện chuẩn là **so thư viện, không so ngôn ngữ**, và khoảng cách nó tạo ra thường
lớn hơn khoảng cách thật giữa các ngôn ngữ:

| Bài | Khi dùng thư viện | Khi tự viết |
|---|---|---|
| `sort` | C++ 204ms · Rust 45ms — **4.5×** | 546 · 522 — **1.05×** |
| `sort-objects` | 27.8 · 11.1 — **2.5×** | 33.8 · 33.8 — **1.00×** |
| `crypto-hash` | 89 · 598 — C++ nhanh **6.7×** | 346 · 223 — Rust nhanh **1.55×** |

`sort` chênh 4.5× vì `sort_unstable` của Rust là pdqsort còn `std::sort` là introsort — hai thuật
toán cách nhau mấy chục năm. `crypto-hash` đảo chiều vì C++/Go/Node gọi assembly viết tay còn
Rust dùng crate thuần Rust.

Vẫn còn dùng thư viện: **`json`** và **`string-regex`**.

Ngoại lệ hợp lý: `file-io` và `startup` đo hệ điều hành và runtime, không có gì để tự viết.

## Luật 3 — Checksum là điều kiện để kết quả được tính

Mỗi chương trình in đúng một dòng:

```
{"ms": 3.347, "checksum": "51fe4556"}
```

Checksum được băm từ **kết quả phép tính**, và mọi ngôn ngữ phải ra cùng một giá trị. Không có nó,
một ngôn ngữ có thể "thắng" vì làm ít việc hơn — sai cận vòng lặp, hay trình biên dịch xoá luôn
phép tính vì kết quả không được dùng.

Khoá so sánh phải cho ra thứ tự **duy nhất** (ví dụ `sort-objects` so theo cặp `(key, id)`), nếu
không sort ổn định và không ổn định sẽ cho hai kết quả khác nhau.

## Luật 4 — Đồng hồ chỉ bao quanh phần việc được đo

Sinh dữ liệu, dựng chuỗi khoá, đọc tham số: tất cả nằm **ngoài** `Timer`. Riêng `startup` thì
ngược lại — nó đo chính thời gian khởi động tiến trình, nên dùng `metric: "wall"`.

## Luật 5 — Mốc `ref` chỉ được sinh từ lượt chạy có đủ mọi ngôn ngữ

Điểm = `1000 × ref / median`, cộng qua các bài. `ref` là mốc **cố định** trong
`benchmarks/reference.json`, chính là median nhanh nhất ở lần đầu bài đó chạy, do runner tự ghi.

Mốc sinh từ lượt chạy thiếu ngôn ngữ là **sai vĩnh viễn**: chạy Node-only thì mốc lấy theo median
của Node, và Node được đúng 1000 điểm ở bài đó mãi mãi. Runner cố tình **không ghi đè** mốc đã có,
nên sai một lần là phải xoá tay.

Sửa một bài test là mốc của nó hết giá trị — xoá mốc đó và chạy lại đủ bộ, và sửa cả mục của nó
trong `benchmarks/guides.json` (luật 1b).

## Luật 5b — Màn hình đua và trang cover đọc CÙNG một nguồn

Danh sách ngôn ngữ, bộ màu, cách viết tên (`node26` → `Node 26`), câu mở đầu và câu cảnh báo đều
nằm ở `web/langs.js`. Cả `race.html` và `cover.html` nạp file đó; **không trang nào được có bảng
ngôn ngữ riêng.**

Ngôn ngữ nào đang chạy do `LB_AGENTS` quyết định, nên cả hai trang phải **hỏi** `/api/languages`,
và số bài test phải lấy từ `/api/registry` — không viết cứng con số nào.

**Vì sao là luật:** cover là khung hình đầu của clip. Trước đây `cover.html` viết cứng bốn ngôn
ngữ C++/Rust/Go/Node và "17 bài test", nên khi đổi sang đua Node/PHP/Python thì ảnh bìa sai ngay
từ giây đầu — và không có gì báo lỗi, vì hai file vẫn chạy tốt, chỉ nói hai chuyện khác nhau.

## Luật 6 — Đo xen kẽ, không chạy dồn từng ngôn ngữ

Warmup cả bốn trước, rồi mỗi vòng đo một lượt qua từng ngôn ngữ. Chạy dồn hết một ngôn ngữ rồi
mới sang ngôn ngữ khác khiến median của mỗi ngôn ngữ nằm gọn trong một khoảng thời gian riêng —
máy nóng dần hay tiến trình khác chen vào là ngôn ngữ đo sau chịu điều kiện khác hẳn.

---

## Kiến trúc

**Mỗi ngôn ngữ một container, mỗi phiên bản cũng một container.** Ngôn ngữ nào được đo do
`LB_AGENTS` trong `docker/compose.yaml` quyết định, không phải do code.

**Agent đo bên trong container** (`runner/agent/`). Gọi `docker exec` cho từng phép đo tốn
50–120ms, mà `fib` chỉ chạy 3ms — chi phí điều phối sẽ lấn hết tín hiệu. Agent nhận lệnh qua HTTP
rồi tự spawn và tự bấm đồng hồ tại chỗ.

**Hạn mức CPU khai một chỗ duy nhất** (`x-limits` trong compose) và mọi ngôn ngữ dùng chung. Để
lệch nhau là `parallel` mở số luồng khác nhau và phép so sánh mất nghĩa.

**Chỉ một phép đo chạy tại một thời điểm.** Container khác phải nằm im, nếu không chúng tranh CPU.
Đừng chạy container kiểm chứng trong lúc đang quay clip hoặc đang đo thật.

```bash
docker compose -f docker/compose.yaml up -d      # bật
open http://localhost:8090/race.html             # màn hình đua 9:16
open http://localhost:8090/cover.html            # xuất ảnh cover 1080×1920
```

## Cấu trúc

```
benchmarks/   một thư mục mỗi bài + registry.json (danh sách) + reference.json (mốc)
              guides.json  hướng dẫn từng bài, hiện ở popup dấu ? — sửa bài test là phải sửa đây
              _common/  tiện ích dùng chung: Timer, Checksum, Lcg, param, report
runner/       run.mjs (điều phối) · agent/ (đo trong container) · lib/
server/       phục vụ web, đọc kết quả, chạy benchmark theo yêu cầu, đẩy SSE
web/          race.html + race.js (màn hình đua) · cover.html (ảnh cover)
              langs.js  ngôn ngữ + màu + câu chữ, DÙNG CHUNG cho cả hai trang (luật 5b)
docker/       compose.yaml + lang/*.Dockerfile (một file mỗi ngôn ngữ)
results/      run-NNNN.json, không vào git
```

## Bài học đã trả giá

**Đừng suy trạng thái từ mức thay đổi giữa hai khung hình — hãy hỏi thẳng trạng thái.** Điều kiện
"điểm nhích hơn 0.5 mỗi frame" làm mọi lượt cộng nhỏ bị câm, và cùng loại lỗi đó khiến ô trạng thái
bị bóp thành `r…`. Sửa triệu chứng thì lỗi chỉ đổi hình dạng.

**Đo trước khi kết luận.** `matmul` từng cho Rust chậm hơn C++ 16.9× trên đoạn mã giống hệt nhau.
Tôi loại sáu giả thuyết bằng thực nghiệm (kiểm tra biên, `target-cpu=native`, profile Cargo, dạng
viết vòng lặp, FP contraction, rút gọn độ phức tạp) trước khi tìm ra nguyên nhân là clang tự vector
hoá số thực mà rustc không. Chuyển sang số nguyên thì còn 1.05×.

**Cộng tổng là một cách đặt trọng số, dù không ai chọn.** Khi mốc đặt lệch, `startup` chiếm 16%
tổng điểm còn `matmul` 2.8%. Mốc đo đúng thì mọi tỉ lệ nằm trong 0–1 và phép cộng tự cân.
