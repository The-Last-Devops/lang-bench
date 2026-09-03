// string-regex — khớp regex trên 200k dòng log. C++ dùng std::regex của thư viện chuẩn.
// string-regex — match a regex over 200k log lines. C++ uses the standard library's std::regex.
#include "common.hpp"
#include <regex>
#include <vector>

static const char* kPattern =
    "^(\\d+\\.\\d+\\.\\d+\\.\\d+) - \\[([0-9-]+)\\] \"(GET|POST) (\\S+) HTTP/1\\.1\" (\\d{3}) (\\d+)$";

int main(int argc, char** argv) {
  const long n = lb::param(argc, argv, "n", 200000);

  // Sinh dữ liệu ngoài đồng hồ: chỉ đo phần regex.
  // Data generation stays outside the clock: we only measure the regex work.
  std::vector<std::string> lines;
  lines.reserve((size_t)n);
  lb::Lcg rng(42);
  for (long i = 0; i < n; ++i) {
    uint32_t a = rng.next() % 256, b = rng.next() % 256;
    uint32_t day = rng.next() % 28 + 1;
    bool post = (rng.next() % 4) == 0;
    uint32_t status = (rng.next() % 10) < 8 ? 200 : (rng.next() % 2 ? 404 : 500);
    uint32_t bytes = rng.next() % 100000;
    char buf[256];
    snprintf(buf, sizeof buf, "10.0.%u.%u - [2026-08-%02u] \"%s /path/%ld HTTP/1.1\" %u %u",
             a, b, day, post ? "POST" : "GET", i, status, bytes);
    lines.emplace_back(buf);
  }

  lb::Timer t;
  std::regex re(kPattern, std::regex::ECMAScript);
  uint32_t sum_bytes = 0, ok200 = 0, posts = 0, matched = 0;
  std::smatch m;
  for (const auto& line : lines) {
    if (std::regex_match(line, m, re)) {
      ++matched;
      if (m[3].str() == "POST") ++posts;
      uint32_t status = (uint32_t)std::stoul(m[5].str());
      if (status == 200) ++ok200;
      sum_bytes = (uint32_t)(sum_bytes + (uint32_t)std::stoul(m[6].str()));
    }
  }
  double ms = t.ms();

  lb::Checksum c;
  c.add(sum_bytes); c.add(ok200); c.add(posts); c.add(matched);
  lb::report(ms, lb::hex8(c.value()));
}
