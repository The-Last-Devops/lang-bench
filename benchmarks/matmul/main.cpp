// matmul — nhân ma trận N×N kiểu ngây thơ trên số nguyên 64-bit, đo thông lượng vòng
// lặp chặt và hành vi cache.
//
// Trước đây bài này dùng f64 và đo nhầm thứ khác: clang tự vector hoá vòng trong, rustc
// thì không, nên Rust chậm hơn C++ 16.9× dù thuật toán giống hệt từng dòng. Chuyển sang
// i64 thì khoảng cách còn 1.05× — con số đúng cho hai đoạn mã như nhau. Số nguyên còn cho
// checksum chính xác tuyệt đối, không phải lấy fmod của một số thực khổng lồ.
//
// matmul — naive N×N matrix multiply over 64-bit integers, measuring tight-loop
// throughput and cache behaviour.
//
// This used to use f64 and measured something else entirely: clang vectorises the inner
// loop and rustc does not, so Rust came out 16.9x slower than C++ on line-for-line
// identical code. On i64 the gap is 1.05x — the honest figure for two equivalent pieces
// of code. Integers also give an exact checksum instead of fmod over a huge float.
#include "common.hpp"
#include <vector>

int main(int argc, char** argv) {
  const int n = (int)lb::param(argc, argv, "n", 256);
  std::vector<int64_t> a((size_t)n * n), b((size_t)n * n), c((size_t)n * n, 0);
  for (int i = 0; i < n; ++i)
    for (int j = 0; j < n; ++j) {
      a[(size_t)i * n + j] = (i * 31 + j * 17) % 100;
      b[(size_t)i * n + j] = (i * 13 + j * 7) % 100;
    }

  lb::Timer t;
  for (int i = 0; i < n; ++i)
    for (int k = 0; k < n; ++k) {
      const int64_t aik = a[(size_t)i * n + k];
      for (int j = 0; j < n; ++j) c[(size_t)i * n + j] += aik * b[(size_t)k * n + j];
    }
  uint64_t sum = 0;
  for (size_t i = 0; i < c.size(); ++i) sum += (uint64_t)c[i];
  double ms = t.ms();

  lb::Checksum ck;
  ck.add_u64(sum);
  lb::report(ms, lb::hex8(ck.value()));
}
