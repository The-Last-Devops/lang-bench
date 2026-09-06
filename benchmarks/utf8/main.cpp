// utf8 — dựng một chuỗi nhiều ngôn ngữ rồi duyệt qua từng ký tự Unicode.
//
// Đây là chỗ bốn ngôn ngữ hiểu "một ký tự" theo bốn kiểu khác hẳn nhau: Go là chuỗi byte
// duyệt ra rune, Rust là UTF-8 có kiểm biên, JS là UTF-16 nên ký tự ngoài BMP chiếm hai
// đơn vị, còn C++ không có khái niệm Unicode nào cả — phải tự giải mã bằng tay.
//
// Chuỗi sinh từ cùng một LCG nên bốn ngôn ngữ nhận đúng cùng dãy điểm mã. Trọng số dùng
// thứ tự của ĐIỂM MÃ, không phải vị trí byte — nếu không thì bốn ngôn ngữ đánh số khác nhau.
//
// utf8 — build a multilingual string, then walk it character by character.
//
// This is where the four languages disagree most about what "a character" is: Go is bytes
// walked as runes, Rust is UTF-8 with boundary checks, JS is UTF-16 so anything outside
// the BMP takes two units, and C++ has no notion of Unicode at all — it must decode by hand.
//
// The string comes from the same LCG, so all four see the same code points. The weight is
// the CODE POINT index, never a byte offset, which the four would number differently.
#include "common.hpp"
#include <string>
#include <vector>

int main(int argc, char** argv) {
  int n = (int)lb::param(argc, argv, "n", 400000);

  // Bốn dải: ASCII 1 byte, Latin 2 byte, CJK 3 byte, ký hiệu 4 byte.
  // Four ranges: ASCII at 1 byte, Latin at 2, CJK at 3, symbols at 4.
  std::vector<uint32_t> cps((size_t)n);
  lb::Lcg rng(2024u);
  for (int i = 0; i < n; ++i) {
    uint32_t r = rng.next();
    switch (r & 3u) {
      case 0: cps[(size_t)i] = 0x20u + (r >> 8) % 95u; break;
      case 1: cps[(size_t)i] = 0xC0u + (r >> 8) % 64u; break;
      case 2: cps[(size_t)i] = 0x4E00u + (r >> 8) % 0x5000u; break;
      default: cps[(size_t)i] = 0x1F300u + (r >> 8) % 0x300u; break;
    }
  }

  std::string s;
  s.reserve((size_t)n * 3);
  for (uint32_t cp : cps) {
    if (cp < 0x80) {
      s.push_back((char)cp);
    } else if (cp < 0x800) {
      s.push_back((char)(0xC0 | (cp >> 6)));
      s.push_back((char)(0x80 | (cp & 0x3F)));
    } else if (cp < 0x10000) {
      s.push_back((char)(0xE0 | (cp >> 12)));
      s.push_back((char)(0x80 | ((cp >> 6) & 0x3F)));
      s.push_back((char)(0x80 | (cp & 0x3F)));
    } else {
      s.push_back((char)(0xF0 | (cp >> 18)));
      s.push_back((char)(0x80 | ((cp >> 12) & 0x3F)));
      s.push_back((char)(0x80 | ((cp >> 6) & 0x3F)));
      s.push_back((char)(0x80 | (cp & 0x3F)));
    }
  }

  lb::Timer t;

  uint32_t sum = 0, wide = 0, idx = 0;
  size_t i = 0;
  while (i < s.size()) {
    uint8_t b0 = (uint8_t)s[i];
    uint32_t cp;
    if (b0 < 0x80) { cp = b0; i += 1; }
    else if ((b0 & 0xE0) == 0xC0) { cp = ((uint32_t)(b0 & 0x1F) << 6) | ((uint8_t)s[i+1] & 0x3F); i += 2; }
    else if ((b0 & 0xF0) == 0xE0) {
      cp = ((uint32_t)(b0 & 0x0F) << 12) | (((uint8_t)s[i+1] & 0x3F) << 6) | ((uint8_t)s[i+2] & 0x3F);
      i += 3;
    } else {
      cp = ((uint32_t)(b0 & 0x07) << 18) | (((uint8_t)s[i+1] & 0x3F) << 12)
         | (((uint8_t)s[i+2] & 0x3F) << 6) | ((uint8_t)s[i+3] & 0x3F);
      i += 4;
    }
    idx += 1;
    sum += idx * cp;
    if (cp > 0x7F) wide += 1;
  }

  double ms = t.ms();
  lb::Checksum c;
  c.add(sum);
  c.add(wide);
  c.add(idx);
  c.add_u64((uint64_t)s.size());
  lb::report(ms, lb::hex8(c.value()));
}
