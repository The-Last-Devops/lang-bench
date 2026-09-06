// string-build — nối chuỗi và tự chuyển số sang thập phân, việc mà code thật làm nhiều nhất
// (log, template, sinh HTML). Cách mỗi ngôn ngữ biểu diễn chuỗi lộ ra rõ nhất ở đây.
//
// Phần đổi số sang chuỗi được VIẾT TAY. Trước đây C++ dùng snprintf, Go dùng strconv, Rust
// dùng write! — ba thứ đó khác nhau rất xa về chi phí: snprintf phải phân tích chuỗi định
// dạng và tra locale ở mỗi lần gọi, còn write! của Rust được monomorphize thành mã chuyên
// biệt. Đó là so THƯ VIỆN, và nó đang phạt oan C++.
//
// string-build — appending, and turning numbers into decimal by hand: what real code does
// most (logs, templates, HTML). How a language represents strings shows most sharply here.
//
// The number-to-string step is HAND-WRITTEN. C++ used snprintf, Go strconv and Rust write!,
// which differ enormously in cost: snprintf parses a format string and consults the locale on
// every call, while Rust's write! monomorphises into specialised code. That compared
// LIBRARIES, and it was penalising C++ for one.
#include "common.hpp"
#include <string>

int main(int argc, char** argv) {
  int n = (int)lb::param(argc, argv, "n", 400000);
  lb::Timer t;

  std::string s;
  s.reserve((size_t)n * 4);
  char buf[12];
  for (int i = 0; i < n; ++i) {
    // Sinh chữ số từ phải sang trái rồi đảo lại — cách chuyển số nguyên sang thập phân
    // ngắn nhất mà không cần chia nhiều lần hơn số chữ số.
    // Digits are produced right to left and then reversed: the shortest integer-to-decimal
    // conversion that never divides more times than there are digits.
    int v = i % 1000;
    int len = 0;
    do { buf[len++] = (char)('0' + v % 10); v /= 10; } while (v);
    while (len > 0) s.push_back(buf[--len]);
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
