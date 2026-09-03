// primes — sàng Eratosthenes, đo vòng lặp chặt và truy cập mảng lớn.
// primes — sieve of Eratosthenes, measuring tight loops over a large array.
#include "common.hpp"
#include <vector>

int main(int argc, char** argv) {
  const long n = lb::param(argc, argv, "n", 10000000);
  lb::Timer t;
  std::vector<uint8_t> composite((size_t)n + 1, 0);
  for (long i = 2; i * i <= n; ++i)
    if (!composite[(size_t)i])
      for (long j = i * i; j <= n; j += i) composite[(size_t)j] = 1;

  uint32_t count = 0, sum = 0;
  for (long i = 2; i <= n; ++i)
    if (!composite[(size_t)i]) { ++count; sum = (uint32_t)(sum + (uint32_t)i); }
  double ms = t.ms();

  lb::Checksum c;
  c.add(count);
  c.add(sum);
  lb::report(ms, lb::hex8(c.value()));
}
