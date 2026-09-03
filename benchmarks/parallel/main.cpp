// parallel — chia matmul cho nhiều luồng. Cùng tổng lượng việc như bài matmul,
// nên checksum phải trùng với matmul ở cùng n.
// parallel — split matmul across threads. Same total work as the matmul benchmark,
// so the checksum must match matmul at the same n.
#include "common.hpp"
#include <cmath>
#include <thread>
#include <vector>

int main(int argc, char** argv) {
  const int n = (int)lb::param(argc, argv, "n", 256);
  int threads = (int)lb::param(argc, argv, "threads", 0);
  if (threads <= 0) threads = (int)std::thread::hardware_concurrency();
  if (threads <= 0) threads = 1;

  std::vector<double> a((size_t)n * n), b((size_t)n * n), c((size_t)n * n, 0.0);
  for (int i = 0; i < n; ++i)
    for (int j = 0; j < n; ++j) {
      a[(size_t)i * n + j] = (double)((i * 31 + j * 17) % 100);
      b[(size_t)i * n + j] = (double)((i * 13 + j * 7) % 100);
    }

  lb::Timer t;
  std::vector<std::thread> pool;
  pool.reserve((size_t)threads);
  for (int w = 0; w < threads; ++w) {
    const int lo = (int)((long)n * w / threads);
    const int hi = (int)((long)n * (w + 1) / threads);
    pool.emplace_back([&a, &b, &c, n, lo, hi] {
      for (int i = lo; i < hi; ++i)
        for (int k = 0; k < n; ++k) {
          const double aik = a[(size_t)i * n + k];
          for (int j = 0; j < n; ++j) c[(size_t)i * n + j] += aik * b[(size_t)k * n + j];
        }
    });
  }
  for (auto& th : pool) th.join();
  double sum = 0.0;
  for (size_t i = 0; i < c.size(); ++i) sum += c[i];
  double ms = t.ms();

  lb::Checksum ck;
  ck.add((uint32_t)fmod(sum, 4294967296.0));
  lb::report(ms, lb::hex8(ck.value()));
}
