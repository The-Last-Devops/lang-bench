// dijkstra — đường đi ngắn nhất trên đồ thị thưa sinh sẵn, dùng heap nhị phân tự viết.
// Đo truy cập bộ nhớ rải rác cộng với một cấu trúc dữ liệu có nhánh rẽ khó đoán.
// dijkstra — shortest paths over a generated sparse graph using a hand-written binary
// heap. This measures scattered memory access plus a data structure whose branches
// the CPU cannot predict.
#include "common.hpp"
#include <vector>

int main(int argc, char** argv) {
  int n = (int)lb::param(argc, argv, "n", 200000);
  int deg = (int)lb::param(argc, argv, "deg", 8);

  // Đồ thị dựng ở dạng CSR, sinh bằng cùng một LCG ở cả bốn ngôn ngữ nên hoàn toàn
  // trùng khớp. Phần dựng nằm ngoài đồng hồ — bài này đo tìm đường, không đo sinh dữ liệu.
  // The graph is built in CSR form from the same LCG in all four languages, so it is
  // identical everywhere. Construction sits outside the clock: this benchmark measures
  // the search, not the data generation.
  std::vector<int> head(n + 1);
  std::vector<int> to((size_t)n * deg);
  std::vector<uint32_t> w((size_t)n * deg);
  lb::Lcg rng(12345u);
  for (int i = 0; i <= n; ++i) head[i] = i * deg;
  for (size_t i = 0; i < to.size(); ++i) {
    to[i] = (int)(rng.next() % (uint32_t)n);
    w[i] = 1u + rng.next() % 1000u;
  }

  lb::Timer t;

  const uint64_t INF = ~0ull;
  std::vector<uint64_t> dist((size_t)n, INF);

  // Heap nhị phân trên mảng phẳng: cặp (khoảng cách, đỉnh). Lười xoá — một đỉnh có thể
  // vào heap nhiều lần, lần lấy ra đầu tiên đã là ngắn nhất, các lần sau bỏ qua.
  // A binary heap over flat arrays holding (distance, node). Deletion is lazy: a node
  // may be pushed several times; the first pop is already the shortest, later ones are
  // skipped.
  std::vector<uint64_t> hd;
  std::vector<int> hv;
  hd.reserve(1 << 16);
  hv.reserve(1 << 16);

  auto push = [&](uint64_t d, int v) {
    hd.push_back(d); hv.push_back(v);
    size_t i = hd.size() - 1;
    while (i > 0) {
      size_t p = (i - 1) / 2;
      if (hd[p] <= hd[i]) break;
      std::swap(hd[p], hd[i]); std::swap(hv[p], hv[i]);
      i = p;
    }
  };
  auto pop = [&]() {
    size_t last = hd.size() - 1;
    std::swap(hd[0], hd[last]); std::swap(hv[0], hv[last]);
    hd.pop_back(); hv.pop_back();
    size_t i = 0, sz = hd.size();
    for (;;) {
      size_t l = i * 2 + 1, r = l + 1, m = i;
      if (l < sz && hd[l] < hd[m]) m = l;
      if (r < sz && hd[r] < hd[m]) m = r;
      if (m == i) break;
      std::swap(hd[m], hd[i]); std::swap(hv[m], hv[i]);
      i = m;
    }
  };

  dist[0] = 0;
  push(0, 0);
  while (!hd.empty()) {
    uint64_t d = hd[0];
    int u = hv[0];
    pop();
    if (d > dist[(size_t)u]) continue;   // bản cũ đã lỗi thời / a stale copy
    for (int e = head[u]; e < head[u + 1]; ++e) {
      uint64_t nd = d + w[(size_t)e];
      int v = to[(size_t)e];
      if (nd < dist[(size_t)v]) { dist[(size_t)v] = nd; push(nd, v); }
    }
  }

  // Tổng khoảng cách là duy nhất bất kể heap phá hoà kiểu gì, nên checksum ổn định.
  // The distance sum is unique no matter how the heap breaks ties, so the checksum is stable.
  uint64_t sum = 0, reach = 0;
  for (int i = 0; i < n; ++i) {
    if (dist[(size_t)i] != INF) { sum += dist[(size_t)i]; ++reach; }
  }

  double ms = t.ms();
  lb::Checksum c;
  c.add_u64(sum);
  c.add_u64(reach);
  lb::report(ms, lb::hex8(c.value()));
}
