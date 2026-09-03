// hashmap — chèn và tra cứu khóa chuỗi, đo bảng băm của thư viện chuẩn.
// hashmap — insert and look up string keys, measuring the standard hash table.
#include "common.hpp"
#include <string>
#include <unordered_map>

int main(int argc, char** argv) {
  const long n = lb::param(argc, argv, "n", 1000000);
  lb::Timer t;
  std::unordered_map<std::string, uint32_t> m;
  m.reserve((size_t)n);
  for (long i = 0; i < n; ++i)
    m["key" + std::to_string(i)] = (uint32_t)((uint64_t)i * 7u);

  uint32_t sum = 0, hits = 0, misses = 0;
  for (long i = 0; i < n; ++i) {
    auto it = m.find("key" + std::to_string(i));
    if (it != m.end()) { ++hits; sum = (uint32_t)(sum + it->second); }
  }
  for (long i = 0; i < n / 2; ++i)
    if (m.find("nokey" + std::to_string(i)) == m.end()) ++misses;
  double ms = t.ms();

  lb::Checksum c;
  c.add(sum); c.add(hits); c.add(misses);
  lb::report(ms, lb::hex8(c.value()));
}
