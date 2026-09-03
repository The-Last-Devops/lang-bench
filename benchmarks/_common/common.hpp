// Tiện ích dùng chung cho các bài test C++ / Shared helpers for the C++ benchmarks.
#pragma once
#include <chrono>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <string>

namespace lb {

// Đồng hồ đo phần việc thật, không tính khởi động tiến trình.
// Clock around the real work only, excluding process startup.
class Timer {
  std::chrono::steady_clock::time_point t0_;
 public:
  Timer() : t0_(std::chrono::steady_clock::now()) {}
  double ms() const {
    return std::chrono::duration<double, std::milli>(
               std::chrono::steady_clock::now() - t0_).count();
  }
};

// Checksum 32-bit: mọi ngôn ngữ phải cho ra cùng một giá trị.
// 32-bit checksum: every language must produce the same value.
class Checksum {
  uint32_t h_ = 2166136261u;  // FNV-1a offset basis
 public:
  void add(uint32_t v) {
    for (int i = 0; i < 4; ++i) {
      h_ ^= (v >> (i * 8)) & 0xffu;
      h_ *= 16777619u;
    }
  }
  void add_u64(uint64_t v) { add((uint32_t)(v & 0xffffffffu)); add((uint32_t)(v >> 32)); }
  uint32_t value() const { return h_; }
};

inline std::string hex8(uint32_t v) {
  char buf[16];
  snprintf(buf, sizeof buf, "%08x", v);
  return std::string(buf);
}

// Sinh số giả ngẫu nhiên xác định: cùng công thức ở cả 5 ngôn ngữ.
// Deterministic PRNG: the exact same formula in all five languages.
class Lcg {
  uint32_t s_;
 public:
  explicit Lcg(uint32_t seed = 42u) : s_(seed) {}
  uint32_t next() { s_ = (uint32_t)(s_ * 1664525u + 1013904223u); return s_; }
};

// Đọc tham số dạng key=value từ dòng lệnh.
// Read a key=value parameter off the command line.
inline long param(int argc, char** argv, const char* key, long fallback) {
  size_t klen = strlen(key);
  for (int i = 1; i < argc; ++i) {
    if (strncmp(argv[i], key, klen) == 0 && argv[i][klen] == '=')
      return strtol(argv[i] + klen + 1, nullptr, 10);
  }
  return fallback;
}

// Dòng duy nhất mà runner đọc. / The single line the runner parses.
inline void report(double ms, const std::string& checksum) {
  printf("{\"ms\": %.3f, \"checksum\": \"%s\"}\n", ms, checksum.c_str());
}

}  // namespace lb
