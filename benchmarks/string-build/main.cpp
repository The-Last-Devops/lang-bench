// string-build — nối chuỗi và định dạng số, việc mà code thật làm nhiều nhất (log,
// template, sinh HTML). Cách mỗi ngôn ngữ biểu diễn chuỗi lộ ra rõ nhất ở đây.
// string-build — appending and number formatting, the thing real code does most (logs,
// templates, HTML). How a language represents strings shows up most sharply here.
#include "common.hpp"
#include <string>

int main(int argc, char** argv) {
  int n = (int)lb::param(argc, argv, "n", 400000);
  lb::Timer t;

  std::string s;
  s.reserve((size_t)n * 4);
  char buf[16];
  for (int i = 0; i < n; ++i) {
    int v = i % 1000;
    int len = snprintf(buf, sizeof buf, "%d", v);
    s.append(buf, (size_t)len);
    s.push_back(',');
  }

  // Cộng có trọng số theo vị trí: đổi chỗ hai ký tự là checksum đổi, khác với cộng thuần.
  // A position-weighted sum: swapping two characters changes it, unlike a plain sum.
  uint32_t sum = 0;
  for (size_t i = 0; i < s.size(); ++i) {
    sum += (uint32_t)(i + 1) * (uint32_t)(unsigned char)s[i];
  }

  double ms = t.ms();
  lb::Checksum c;
  c.add(sum);
  c.add_u64((uint64_t)s.size());
  lb::report(ms, lb::hex8(c.value()));
}
