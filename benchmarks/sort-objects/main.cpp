// sort-objects — merge sort đáy-lên TỰ VIẾT trên mảng bản ghi, so theo khoá (key, id).
//
// Cùng thuật toán với bài `sort`, chỉ khác là sắp xếp BẢN GHI chứ không phải số. Khác biệt
// đó mới là điều bài này muốn đo: mỗi lần so phải chạm hai trường, và mỗi lần chuyển phải
// dời cả bản ghi thay vì một số 32-bit — nên cách mỗi ngôn ngữ bố trí struct trong bộ nhớ
// lộ ra ở đây.
//
// Khoá là cặp (key, id) nên thứ tự cuối cùng là DUY NHẤT, bốn ngôn ngữ buộc phải ra cùng
// một kết quả.
//
// sort-objects — a hand-written bottom-up merge sort over records, keyed on (key, id).
//
// The same algorithm as `sort`, but over RECORDS rather than numbers, and that difference is
// the point: every comparison touches two fields and every move carries a whole record
// instead of a 32-bit integer, so how each language lays a struct out in memory shows here.
//
// The key is the pair (key, id), so the final order is UNIQUE and all four languages are
// forced to the same result.
#include "common.hpp"
#include <vector>

namespace {
struct Rec {
  uint32_t key;
  uint32_t id;
};
inline bool before(const Rec& a, const Rec& b) {
  return a.key != b.key ? a.key < b.key : a.id < b.id;
}
}  // namespace

int main(int argc, char** argv) {
  size_t n = (size_t)lb::param(argc, argv, "n", 400000);

  std::vector<Rec> v(n), buf(n);
  lb::Lcg rng(99u);
  for (size_t i = 0; i < n; ++i) v[i] = Rec{rng.next(), (uint32_t)i};

  lb::Timer t;

  Rec* a = v.data();
  Rec* b = buf.data();
  for (size_t width = 1; width < n; width *= 2) {
    for (size_t lo = 0; lo < n; lo += width * 2) {
      size_t mid = lo + width < n ? lo + width : n;
      size_t hi = lo + width * 2 < n ? lo + width * 2 : n;
      size_t i = lo, j = mid, k = lo;
      while (i < mid && j < hi) b[k++] = before(a[j], a[i]) ? a[j++] : a[i++];
      while (i < mid) b[k++] = a[i++];
      while (j < hi) b[k++] = a[j++];
    }
    Rec* tmp = a; a = b; b = tmp;
  }
  if (a != v.data()) for (size_t i = 0; i < n; ++i) v[i] = a[i];

  uint32_t sum = 0;
  for (size_t i = 0; i < n; ++i) sum += (uint32_t)(i + 1) * (v[i].key ^ v[i].id);
  double ms = t.ms();

  lb::Checksum c;
  c.add(sum);
  c.add(v.front().key);
  c.add(v.back().key);
  lb::report(ms, lb::hex8(c.value()));
}
