// matmul — nhân ma trận N×N kiểu ngây thơ, đo thông lượng số thực và cache.
// matmul — naive N×N matrix multiply, measuring float throughput and cache behaviour.
#include "common.hpp"
#include <cmath>
#include <vector>

int main(int argc, char** argv) {
  const int n = (int)lb::param(argc, argv, "n", 256);
  std::vector<double> a((size_t)n * n), b((size_t)n * n), c((size_t)n * n, 0.0);
  for (int i = 0; i < n; ++i)
    for (int j = 0; j < n; ++j) {
      a[(size_t)i * n + j] = (double)((i * 31 + j * 17) % 100);
      b[(size_t)i * n + j] = (double)((i * 13 + j * 7) % 100);
    }

  lb::Timer t;
  for (int i = 0; i < n; ++i)
    for (int k = 0; k < n; ++k) {
      const double aik = a[(size_t)i * n + k];
      for (int j = 0; j < n; ++j) c[(size_t)i * n + j] += aik * b[(size_t)k * n + j];
    }
  double sum = 0.0;
  for (size_t i = 0; i < c.size(); ++i) sum += c[i];
  double ms = t.ms();

  lb::Checksum ck;
  ck.add((uint32_t)fmod(sum, 4294967296.0));
  lb::report(ms, lb::hex8(ck.value()));
}
