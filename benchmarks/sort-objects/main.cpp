// sort-objects — sắp xếp mảng bản ghi bằng hàm so sánh, khác hẳn bài sort vốn chỉ sắp
// mảng số nguyên. Chỗ này lộ ra chi phí gọi hàm so sánh: C++ inline hẳn template, Rust
// monomorphize, Go đi qua closure, JS gọi callback cho từng cặp.
//
// Khoá so sánh là cặp (key, id) nên thứ tự cuối cùng là DUY NHẤT — nhờ vậy sort ổn định
// hay không ổn định đều cho ra cùng một kết quả, và checksum so sánh được.
//
// sort-objects — sorting records through a comparator, unlike the sort benchmark which
// orders plain integers. This exposes the cost of the comparison call: C++ inlines the
// template, Rust monomorphises, Go goes through a closure, JS calls back per pair.
//
// The key is the pair (key, id), so the final order is UNIQUE — a stable and an unstable
// sort therefore agree, and the checksum is comparable.
#include "common.hpp"
#include <algorithm>
#include <vector>

namespace {
struct Rec {
  uint32_t key;
  uint32_t id;
};
}  // namespace

int main(int argc, char** argv) {
  size_t n = (size_t)lb::param(argc, argv, "n", 1000000);

  std::vector<Rec> v(n);
  lb::Lcg rng(99u);
  for (size_t i = 0; i < n; ++i) v[i] = Rec{rng.next(), (uint32_t)i};

  lb::Timer t;
  std::sort(v.begin(), v.end(), [](const Rec& a, const Rec& b) {
    if (a.key != b.key) return a.key < b.key;
    return a.id < b.id;
  });
  uint32_t sum = 0;
  for (size_t i = 0; i < n; ++i) sum += (uint32_t)(i + 1) * (v[i].key ^ v[i].id);
  double ms = t.ms();

  lb::Checksum c;
  c.add(sum);
  c.add(v.front().key);
  c.add(v.back().key);
  lb::report(ms, lb::hex8(c.value()));
}
