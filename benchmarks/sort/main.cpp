// sort — sắp xếp mảng số nguyên 32-bit bằng hàm sort của thư viện chuẩn.
// sort — sort an array of 32-bit integers with the standard library's sort.
#include "common.hpp"
#include <algorithm>
#include <vector>

int main(int argc, char** argv) {
  const long n = lb::param(argc, argv, "n", 3000000);
  std::vector<uint32_t> v((size_t)n);
  lb::Lcg rng(42);
  for (long i = 0; i < n; ++i) v[(size_t)i] = rng.next();

  lb::Timer t;
  std::sort(v.begin(), v.end());
  double ms = t.ms();

  uint32_t sum = 0;
  for (long i = 0; i < n; i += 1000) sum = (uint32_t)(sum + v[(size_t)i]);
  lb::Checksum c;
  c.add(v[0]); c.add(v[(size_t)n - 1]); c.add(sum);
  lb::report(ms, lb::hex8(c.value()));
}
