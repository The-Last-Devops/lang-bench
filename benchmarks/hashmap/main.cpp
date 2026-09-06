// hashmap — bảng băm địa chỉ mở TỰ VIẾT, khoá chuỗi.
//
// Trước đây bài này dùng unordered_map / HashMap / map / Map — tức là so THƯ VIỆN, và bốn
// thư viện đó khác nhau tận gốc: hàm băm khác nhau, cách xử lý va chạm khác nhau (dây xích
// với C++, Swiss table với Rust), hệ số tải khác nhau. Không phép so sánh nào về ngôn ngữ
// tồn tại được trong đó.
//
// Giờ cả bốn chạy đúng một cấu trúc: địa chỉ mở, dò tuyến tính, sức chứa là luỹ thừa của 2,
// băm FNV-1a. Chuỗi khoá dựng NGOÀI đồng hồ, nên phần đo chỉ còn đúng việc của bảng băm chứ
// không lẫn chi phí đổi số sang chuỗi.
//
// hashmap — a hand-written open-addressing hash table with string keys.
//
// This used to use unordered_map / HashMap / map / Map, which compares LIBRARIES, and those
// four differ at the root: different hash functions, different collision strategies (chaining
// in C++, a Swiss table in Rust), different load factors. No comparison of languages survives
// inside that.
//
// All four now run one structure: open addressing, linear probing, power-of-two capacity,
// FNV-1a. The key strings are built OUTSIDE the clock, so the measurement is the table's work
// and not the cost of turning numbers into strings.
#include "common.hpp"
#include <string>
#include <vector>

namespace {

inline uint32_t hashKey(const std::string& s) {
  uint32_t h = 2166136261u;
  for (unsigned char ch : s) { h ^= ch; h *= 16777619u; }
  return h;
}

struct Table {
  std::vector<std::string> keys;
  std::vector<uint32_t> vals;
  std::vector<uint8_t> used;
  uint32_t mask;

  explicit Table(size_t cap) : keys(cap), vals(cap, 0), used(cap, 0), mask((uint32_t)(cap - 1)) {}

  void put(const std::string& k, uint32_t v) {
    uint32_t i = hashKey(k) & mask;
    while (used[i]) {
      if (keys[i] == k) { vals[i] = v; return; }
      i = (i + 1) & mask;
    }
    used[i] = 1; keys[i] = k; vals[i] = v;
  }

  // Trả về con trỏ tới giá trị, hoặc nullptr — dò dừng ở ô trống đầu tiên, vì bảng này
  // không bao giờ xoá nên ô trống nghĩa là chắc chắn không có khoá.
  // Returns a pointer to the value or nullptr. Probing stops at the first empty slot: this
  // table never deletes, so an empty slot proves the key is absent.
  const uint32_t* get(const std::string& k) const {
    uint32_t i = hashKey(k) & mask;
    while (used[i]) {
      if (keys[i] == k) return &vals[i];
      i = (i + 1) & mask;
    }
    return nullptr;
  }
};

}  // namespace

int main(int argc, char** argv) {
  const long n = lb::param(argc, argv, "n", 1000000);

  std::vector<std::string> keys((size_t)n), absent((size_t)(n / 2));
  for (long i = 0; i < n; ++i) keys[(size_t)i] = "key" + std::to_string(i);
  for (long i = 0; i < n / 2; ++i) absent[(size_t)i] = "nokey" + std::to_string(i);

  size_t cap = 1;
  while (cap < (size_t)n * 2) cap *= 2;

  lb::Timer t;

  Table m(cap);
  for (long i = 0; i < n; ++i) m.put(keys[(size_t)i], (uint32_t)((uint64_t)i * 7u));

  uint32_t sum = 0, hits = 0, misses = 0;
  for (long i = 0; i < n; ++i) {
    const uint32_t* v = m.get(keys[(size_t)i]);
    if (v) { ++hits; sum = (uint32_t)(sum + *v); }
  }
  for (long i = 0; i < n / 2; ++i) if (!m.get(absent[(size_t)i])) ++misses;

  double ms = t.ms();

  lb::Checksum c;
  c.add(sum); c.add(hits); c.add(misses);
  lb::report(ms, lb::hex8(c.value()));
}
