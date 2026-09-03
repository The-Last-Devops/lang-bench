# lang-bench

**[🇻🇳 Tiếng Việt](#tiếng-việt) · [🇬🇧 English](#english)**

Tự viết benchmark so sánh hiệu năng **C++ · Rust · Go · Java · Node.js · PHP · Python · Ruby** —
cùng một thuật toán, cùng một checksum, kết quả xem trên web.

Hand-written benchmarks comparing **C++ · Rust · Go · Java · Node.js · PHP · Python · Ruby** —
the same algorithm, the same checksum, results on a web dashboard.

---

<a name="tiếng-việt"></a>

# 🇻🇳 Tiếng Việt

## Đây là gì

12 bài test, 8 ngôn ngữ, 96 phép đo. Mọi bài test đều **tự viết trong repo này** — không tải
bộ benchmark nào từ trên mạng về.

Điều làm repo này khác một bài blog "X nhanh hơn Y": mỗi bài test in ra một **checksum**, và
kết quả chỉ được tính khi **tất cả 8 ngôn ngữ cho ra cùng một checksum**. Nếu một ngôn ngữ
lệch checksum, nghĩa là nó đã làm việc khác — bài đó bị loại khỏi điểm, chứ không được báo là
"nhanh hơn".

## Chạy thử

Cần Docker. Không cần cài gì khác.

```bash
git clone git@github.com:The-Last-Devops/lang-bench.git
cd lang-bench

# Chạy toàn bộ rồi bật dashboard (mất khoảng 15–25 phút lần đầu vì phải build)
docker compose -f docker/compose.yaml run --rm --service-ports bench

# Chỉ bật dashboard để xem kết quả cũ / bấm Run từ trình duyệt
docker compose -f docker/compose.yaml run --rm --service-ports bench node server/index.mjs
```

Mở **http://localhost:8090**. Đổi cổng bằng `LB_PORT=9000 docker compose ...`.

Chạy nhanh để thử (ít lần chạy hơn, số liệu **không dùng để công bố**):

```bash
docker compose -f docker/compose.yaml run --rm bench node runner/run.mjs --quick
```

Chạy vài bài / vài ngôn ngữ:

```bash
docker compose -f docker/compose.yaml run --rm bench \
  node runner/run.mjs --only=json,sort,startup --langs=cpp,rust,python --runs=10
```

### Cờ của runner

| Cờ | Ý nghĩa |
|---|---|
| `--only=a,b,c` | chỉ chạy các bài này |
| `--langs=a,b,c` | chỉ chạy các ngôn ngữ này |
| `--runs=N` | ép số lần chạy cho mọi bài (mặc định mỗi bài có số riêng) |
| `--warmup=N` | số lần warmup bị loại bỏ (mặc định 2) |
| `--quick` | giảm số lần chạy — để thử, không để công bố |
| `--timeout=S` | giới hạn giây cho mỗi lần chạy (mặc định 300) |
| `--serve` | chạy xong thì bật luôn dashboard |

### Chạy trực tiếp trên máy (không Docker)

Được, nhưng kết quả **không so sánh được** với kết quả Docker của người khác — mỗi máy một
phiên bản toolchain. Cần có: `c++`, `cargo`, `go`, `javac`, `node`, `php`, `python3`, `ruby`.
Thiếu cái nào thì ngôn ngữ đó bị bỏ qua, không làm sập lượt chạy.

```bash
node runner/run.mjs --serve
```

## 12 bài test

| Nhóm | Bài | Đo cái gì |
|---|---|---|
| **A · CPU thuần** | `fib` | fib(32) đệ quy — chi phí gọi hàm và stack |
| | `matmul` | nhân ma trận 256×256 — thông lượng số thực |
| | `primes` | sàng Eratosthenes tới 10 triệu — vòng lặp chặt trên mảng lớn |
| **B · Dữ liệu & bộ nhớ** | `hashmap` | 1 triệu khóa chuỗi — chèn, tra trúng, tra trượt |
| | `json` | 100k record — dựng, serialize, parse lại |
| | `sort` | sắp xếp 3 triệu số nguyên bằng thư viện chuẩn |
| | `alloc-gc` | 2 triệu object nhỏ — áp lực cấp phát và thu hồi |
| **C · Chuỗi** | `string-regex` | 200k dòng log khớp regex |
| | `crypto-hash` | SHA-256 trên 200 MB |
| **D · Hệ thống** | `file-io` | ghi rồi đọc lại 256 MB |
| | `parallel` | matmul chia cho nhiều luồng |
| | `startup` | khởi động, in một dòng, thoát |

## Điểm tổng hợp

Càng cao càng nhanh. Thang 100.

```
mỗi bài:  r = thời_gian_nhanh_nhất / thời_gian_của_ngôn_ngữ     (0 < r ≤ 1)
tổng:     điểm = trung_bình_hình_học(r₁ … rₙ) × 100
```

Dùng **trung bình hình học** (cách SPEC làm), không phải cộng-chia, để một bài chậm bất
thường không nuốt hết điểm. Mọi bài trọng số bằng nhau.

**Đọc con số này cho đúng:** một con số không thay được 12 bài test. Điểm tổng phụ thuộc vào
việc *chọn bài nào* — thêm một bài regex nữa là C++ tụt tiếp, thêm một bài CPU thuần là Python
tụt tiếp. Hãy xem điểm theo nhóm và số liệu từng bài trước khi kết luận.

## Chúng tôi làm gì để công bằng

- **Cùng một thuật toán ở cả 8 ngôn ngữ.** Không SIMD viết tay, không memoize, không thư viện
  ngoài — trừ khi bài đó ghi rõ trong ghi chú (ví dụ C++ không có JSON trong thư viện chuẩn).
- **Checksum bắt buộc khớp.** Mỗi bài in một checksum 32-bit tính bằng đúng một công thức
  (FNV-1a) ở cả 8 ngôn ngữ. Lệch một chữ là bài đó bị loại khỏi điểm.
- **Chạy tuần tự.** Một ngôn ngữ, một bài, một lần chạy tại một thời điểm. Không bao giờ song
  song — hai tiến trình tranh CPU là số liệu sai.
- **Lấy trung vị, không lấy trung bình.** Cộng thêm min/max/σ để bạn tự đánh giá độ tin cậy.
- **Warmup bị loại bỏ.** Mặc định 2 lần đầu không tính.
- **Đo hai đồng hồ.** Thời gian bên trong chương trình *và* thời gian tiến trình → chi phí
  khởi động luôn nhìn thấy được, không bị trộn vào.
- **Đo cả bộ nhớ đỉnh (peak RSS)** cho mọi phép đo.
- **Kèm toàn bộ thông tin môi trường** vào mỗi file kết quả. Hai lượt chạy khác môi trường thì
  dashboard **từ chối** so sánh với nhau.
- **Cờ tối ưu mức production**: `-O3`, `cargo --release` + LTO, `go build -ldflags="-s -w"`,
  PHP bật JIT, Ruby bật YJIT nếu có.

## Cái này KHÔNG đo được

Nói thẳng để bạn không dùng sai:

- **Không đo được "ngôn ngữ nào tốt hơn".** Chỉ đo tốc độ trên 12 loại việc cụ thể. Thời gian
  viết code, dễ bảo trì, thư viện có sẵn, tuyển người — không có gì ở đây.
- **Không đo được hiệu năng đỉnh của mỗi ngôn ngữ.** C++ với simdjson, Python với numpy, Java
  với Jackson đều nhanh hơn nhiều. Chúng tôi cố tình dùng thuật toán giống nhau, không phải
  giải pháp tối ưu nhất của từng ngôn ngữ.
- **Không đo được server thật.** Không có bài nào chạm tới HTTP, database hay network.
- **`file-io` trong Docker trên macOS/Windows sai đáng kể** — Docker chạy trong VM. Chỉ so
  `file-io` giữa các lượt cùng môi trường.
- **`parallel` phụ thuộc số lõi container được cấp.** Docker Desktop mặc định cấp ít hơn số
  lõi máy thật. Xem `cpus:` trong `docker/compose.yaml`.
- **Java bị tính cả phần JIT chưa kịp làm nóng**, vì mỗi lần chạy là một tiến trình JVM mới.
  Đó là con số thật cho một tiến trình chạy một lần, không phải cho một server chạy hàng giờ.

## Cấu trúc repo

```
benchmarks/
  registry.json          # định nghĩa 12 bài + 8 ngôn ngữ + ghi chú song ngữ
  _common/               # thư viện dùng chung: Timer, Checksum, Lcg, param, report
    common.hpp  json.hpp        (C++)
    common.rs                   (Rust)
    common.mjs                  (Node.js)
    common.php                  (PHP)
    common.py                   (Python)
    common.rb                   (Ruby)
    Common.java Json.java       (Java)
  gocommon/common.go            (Go)
  <bài>/
    main.cpp  main.rs  go/main.go  Main.java
    main.js   main.php  main.py   main.rb
runner/
  run.mjs                # build + chạy tuần tự + tính điểm + ghi results/
  lib/host.mjs           # thu thập thông tin môi trường
  lib/measure.mjs        # đo một lần chạy: wall, internal, peak RSS
  lib/build.mjs          # build từng ngôn ngữ, thiếu toolchain thì bỏ qua
  lib/score.mjs          # trung bình hình học
server/index.mjs         # HTTP + SSE, không phụ thuộc gói ngoài
web/                     # dashboard Vue 3 (Vue vendor sẵn, chạy offline được)
results/                 # run-0001.json, run-0002.json, …
docker/                  # Dockerfile + compose.yaml
design/                  # mockup thiết kế dashboard
```

## Giao ước giữa runner và bài test

Mọi chương trình benchmark, ở mọi ngôn ngữ, phải:

1. Đọc tham số dạng `key=value` từ dòng lệnh (ví dụ `n=256`).
2. In ra **đúng một dòng** JSON trên stdout:
   ```json
   {"ms": 123.456, "checksum": "8f3a91c2"}
   ```
   `ms` là thời gian của **phần việc thật**, không tính khởi động tiến trình.
3. Thoát với mã 0.

Runner tự đo thời gian tiến trình và peak RSS từ bên ngoài, nên bài test không cần quan tâm.

## Thêm một ngôn ngữ

1. Viết `_common/common.<ext>` với `Timer`, `Checksum` (FNV-1a như các bản khác), `Lcg`,
   `param`, `report`.
2. Viết 12 file `main.<ext>` trong từng thư mục bài.
3. Thêm một mục vào `languages` trong `registry.json` (id, name, màu).
4. Thêm nhánh build/run vào `runner/lib/build.mjs`.
5. Thêm toolchain vào `docker/Dockerfile`.
6. Chạy `--runs=1` và kiểm tra **mọi checksum khớp** với các ngôn ngữ cũ. Nếu lệch, sửa cho
   đến khi khớp — lệch checksum là bài test khác nhau, không phải hiệu năng khác nhau.

## Thêm một bài test

Thêm một mục vào `benchmarks` trong `registry.json`, tạo thư mục cùng tên, viết 8 file. Bài
test phải **xác định hoàn toàn**: dùng `Lcg` (cùng công thức ở mọi ngôn ngữ) chứ không dùng
random của hệ thống, và sinh dữ liệu bên ngoài đồng hồ nếu việc sinh dữ liệu không phải thứ
bạn muốn đo.

## Bảng màu

8 màu của 8 ngôn ngữ đã qua validator: đạt cả 6 kiểm tra (dải độ sáng, độ bão hoà tối thiểu,
tách màu cho người mù màu, tương phản trên nền tối). Dù vậy 8 series là ngưỡng trên của việc
phân biệt bằng màu, nên **mọi bar trong dashboard đều có nhãn tên ngôn ngữ** — không ai phải
dựa vào màu để đọc kết quả.

---

<a name="english"></a>

# 🇬🇧 English

## What this is

12 benchmarks, 8 languages, 96 measurements. Every benchmark is **hand-written in this repo** —
nothing is downloaded from an existing benchmark suite.

What makes this different from a "X is faster than Y" blog post: every benchmark prints a
**checksum**, and a result only counts when **all 8 languages produce the same checksum**. If a
language's checksum differs, it did different work — that benchmark is dropped from the score
rather than being reported as "faster".

## Running it

You need Docker. Nothing else.

```bash
git clone git@github.com:The-Last-Devops/lang-bench.git
cd lang-bench

# Run the whole suite, then serve the dashboard (15–25 min the first time, because of the build)
docker compose -f docker/compose.yaml run --rm --service-ports bench

# Just serve the dashboard, to read old results or hit Run from the browser
docker compose -f docker/compose.yaml run --rm --service-ports bench node server/index.mjs
```

Open **http://localhost:8090**. Change the port with `LB_PORT=9000 docker compose ...`.

A quick run for trying things out (fewer repetitions — **not for publishing**):

```bash
docker compose -f docker/compose.yaml run --rm bench node runner/run.mjs --quick
```

Some benchmarks / some languages:

```bash
docker compose -f docker/compose.yaml run --rm bench \
  node runner/run.mjs --only=json,sort,startup --langs=cpp,rust,python --runs=10
```

### Runner flags

| Flag | Meaning |
|---|---|
| `--only=a,b,c` | run only these benchmarks |
| `--langs=a,b,c` | run only these languages |
| `--runs=N` | force the repetition count for every benchmark (each has its own default) |
| `--warmup=N` | warmup repetitions, always discarded (default 2) |
| `--quick` | fewer repetitions — for trying things, not for publishing |
| `--timeout=S` | per-repetition timeout in seconds (default 300) |
| `--serve` | serve the dashboard when the run finishes |

### Running natively (no Docker)

Works, but the results are **not comparable** with anyone else's Docker results — every machine
has different toolchain versions. You need `c++`, `cargo`, `go`, `javac`, `node`, `php`,
`python3`, `ruby`. A missing one skips that language instead of failing the run.

```bash
node runner/run.mjs --serve
```

## The 12 benchmarks

| Group | Benchmark | What it measures |
|---|---|---|
| **A · Pure CPU** | `fib` | fib(32) recursive — call and stack cost |
| | `matmul` | 256×256 matrix multiply — float throughput |
| | `primes` | sieve of Eratosthenes to 10 million — tight loops over a large array |
| **B · Data & memory** | `hashmap` | 1 million string keys — insert, hit, miss |
| | `json` | 100k records — build, serialize, parse back |
| | `sort` | sort 3 million integers with the standard library |
| | `alloc-gc` | 2 million small objects — allocation and reclamation pressure |
| **C · Strings** | `string-regex` | 200k log lines matched by regex |
| | `crypto-hash` | SHA-256 over 200 MB |
| **D · Systems** | `file-io` | write then read back 256 MB |
| | `parallel` | matmul split across threads |
| | `startup` | start up, print one line, exit |

## The overall score

Higher is faster. Out of 100.

```
per benchmark:  r = fastest_time / this_language_time      (0 < r ≤ 1)
overall:        score = geometric_mean(r₁ … rₙ) × 100
```

It uses the **geometric mean** (what SPEC does), not the arithmetic mean, so one pathological
benchmark cannot swallow the whole score. Every benchmark carries equal weight.

**Read this number carefully:** one number cannot replace 12 benchmarks. The overall score
depends on *which benchmarks were picked* — add another regex test and C++ drops further; add
another pure-CPU test and Python drops further. Read the per-group scores and the individual
numbers before concluding anything.

## What we do to keep it fair

- **The same algorithm in all 8 languages.** No hand-written SIMD, no memoisation, no external
  libraries — unless the benchmark's note says otherwise (for example, C++ has no JSON in its
  standard library).
- **Checksums must match.** Every benchmark prints a 32-bit checksum computed by one identical
  formula (FNV-1a) in all 8 languages. One digit off and that benchmark is dropped from the score.
- **Strictly sequential.** One language, one benchmark, one repetition at a time. Never in
  parallel — two processes fighting for CPU produce wrong numbers.
- **Median, not mean.** Plus min/max/σ so you can judge the reliability yourself.
- **Warmup is discarded.** The first 2 repetitions by default.
- **Two clocks.** The work inside the program *and* the whole process → startup cost stays
  visible instead of being folded in.
- **Peak memory (RSS)** recorded for every measurement.
- **The full environment is attached** to every result file. The dashboard **refuses** to
  compare two runs from different environments.
- **Production optimisation flags**: `-O3`, `cargo --release` + LTO, `go build -ldflags="-s -w"`,
  PHP with JIT on, Ruby with YJIT when available.

## What this does NOT measure

Stated plainly so you don't misuse it:

- **Not "which language is better".** Only speed on 12 specific kinds of work. Time to write the
  code, maintainability, available libraries, hiring — none of that is here.
- **Not each language's peak performance.** C++ with simdjson, Python with numpy, Java with
  Jackson are all far faster. We deliberately use the same algorithm, not each language's best
  possible solution.
- **Not a real server.** No benchmark touches HTTP, a database or the network.
- **`file-io` under Docker on macOS/Windows is significantly off** — Docker runs inside a VM.
  Only compare `file-io` between runs in the same environment.
- **`parallel` depends on the cores granted to the container.** Docker Desktop grants fewer than
  the host has by default. See `cpus:` in `docker/compose.yaml`.
- **Java is charged for JIT it has not warmed up**, because every repetition is a fresh JVM
  process. That is the honest number for a process that runs once, not for a server running
  for hours.

## Repo layout

```
benchmarks/
  registry.json          # defines the 12 benchmarks + 8 languages + bilingual notes
  _common/               # shared helpers: Timer, Checksum, Lcg, param, report
    common.hpp  json.hpp        (C++)
    common.rs                   (Rust)
    common.mjs                  (Node.js)
    common.php                  (PHP)
    common.py                   (Python)
    common.rb                   (Ruby)
    Common.java Json.java       (Java)
  gocommon/common.go            (Go)
  <benchmark>/
    main.cpp  main.rs  go/main.go  Main.java
    main.js   main.php  main.py   main.rb
runner/
  run.mjs                # build + sequential run + scoring + writes results/
  lib/host.mjs           # collects the environment
  lib/measure.mjs        # one measurement: wall, internal, peak RSS
  lib/build.mjs          # per-language build; a missing toolchain is skipped
  lib/score.mjs          # geometric mean
server/index.mjs         # HTTP + SSE, no external dependencies
web/                     # Vue 3 dashboard (Vue vendored, works offline)
results/                 # run-0001.json, run-0002.json, …
docker/                  # Dockerfile + compose.yaml
design/                  # dashboard design mockup
```

## The contract between the runner and a benchmark

Every benchmark program, in every language, must:

1. Read `key=value` parameters from the command line (for example `n=256`).
2. Print **exactly one line** of JSON on stdout:
   ```json
   {"ms": 123.456, "checksum": "8f3a91c2"}
   ```
   `ms` is the time for the **real work**, excluding process startup.
3. Exit with code 0.

The runner measures process wall time and peak RSS from the outside, so a benchmark never has
to care about either.

## Adding a language

1. Write `_common/common.<ext>` with `Timer`, `Checksum` (FNV-1a, same as the others), `Lcg`,
   `param`, `report`.
2. Write the 12 `main.<ext>` files, one per benchmark directory.
3. Add an entry to `languages` in `registry.json` (id, name, colour).
4. Add a build/run branch to `runner/lib/build.mjs`.
5. Add the toolchain to `docker/Dockerfile`.
6. Run with `--runs=1` and check that **every checksum matches** the existing languages. If one
   differs, fix it until it matches — a differing checksum means a different benchmark, not
   different performance.

## Adding a benchmark

Add an entry to `benchmarks` in `registry.json`, create a directory with the same name, write 8
files. A benchmark must be **fully deterministic**: use `Lcg` (the same formula everywhere)
rather than the system's random source, and generate data outside the clock when generating it
is not the thing you want to measure.

## The colour palette

The 8 language colours went through a validator and pass all six checks (lightness band, chroma
floor, colour-vision-deficiency separation, contrast against the dark surface). Even so, 8 series
is the upper bound of what colour alone can distinguish, so **every bar in the dashboard carries
its language name** — nobody has to rely on colour to read a result.

---

## License

MIT
