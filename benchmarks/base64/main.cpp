// base64 — mã hoá rồi giải mã một khối dữ liệu. Toàn thao tác dịch bit và tra bảng trên
// mảng byte: không thư viện, không cấp phát vặt, chỉ là vòng lặp trên bộ nhớ liên tục.
// base64 — encode a block of data, then decode it back. Pure bit-shifting and table
// lookups over byte arrays: no libraries, no small allocations, just tight loops over
// contiguous memory.
#include "common.hpp"
#include <vector>

static const char* ALPHA =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

int main(int argc, char** argv) {
  size_t size = (size_t)lb::param(argc, argv, "size", 3000000);

  std::vector<uint8_t> src(size);
  lb::Lcg rng(7u);
  for (size_t i = 0; i < size; ++i) src[i] = (uint8_t)(rng.next() >> 24);

  // Bảng giải mã dựng sẵn, nằm ngoài đồng hồ — nó là hằng số, không phải phần việc.
  // The decode table is built outside the clock: it is a constant, not part of the work.
  int8_t rev[256];
  for (int i = 0; i < 256; ++i) rev[i] = -1;
  for (int i = 0; i < 64; ++i) rev[(uint8_t)ALPHA[i]] = (int8_t)i;

  lb::Timer t;

  size_t encLen = (size + 2) / 3 * 4;
  std::vector<uint8_t> enc(encLen);
  size_t o = 0;
  for (size_t i = 0; i < size; i += 3) {
    uint32_t v = (uint32_t)src[i] << 16;
    if (i + 1 < size) v |= (uint32_t)src[i + 1] << 8;
    if (i + 2 < size) v |= (uint32_t)src[i + 2];
    enc[o++] = (uint8_t)ALPHA[(v >> 18) & 63];
    enc[o++] = (uint8_t)ALPHA[(v >> 12) & 63];
    enc[o++] = i + 1 < size ? (uint8_t)ALPHA[(v >> 6) & 63] : (uint8_t)'=';
    enc[o++] = i + 2 < size ? (uint8_t)ALPHA[v & 63] : (uint8_t)'=';
  }

  std::vector<uint8_t> dec(size);
  size_t d = 0;
  for (size_t i = 0; i < encLen; i += 4) {
    int32_t c0 = rev[enc[i]], c1 = rev[enc[i + 1]];
    int32_t c2 = enc[i + 2] == '=' ? -1 : rev[enc[i + 2]];
    int32_t c3 = enc[i + 3] == '=' ? -1 : rev[enc[i + 3]];
    uint32_t v = (uint32_t)(c0 << 18) | (uint32_t)(c1 << 12);
    if (c2 >= 0) v |= (uint32_t)(c2 << 6);
    if (c3 >= 0) v |= (uint32_t)c3;
    if (d < size) dec[d++] = (uint8_t)((v >> 16) & 0xff);
    if (c2 >= 0 && d < size) dec[d++] = (uint8_t)((v >> 8) & 0xff);
    if (c3 >= 0 && d < size) dec[d++] = (uint8_t)(v & 0xff);
  }

  // Cộng có trọng số vị trí, tràn vòng 32-bit: bắt được cả sai giá trị lẫn sai thứ tự.
  // Position-weighted sums with 32-bit wraparound: they catch wrong bytes and wrong order alike.
  uint32_t encSum = 0, decSum = 0;
  for (size_t i = 0; i < encLen; ++i) encSum += (uint32_t)(i + 1) * enc[i];
  for (size_t i = 0; i < d; ++i) decSum += (uint32_t)(i + 1) * dec[i];

  double ms = t.ms();
  lb::Checksum c;
  c.add(encSum);
  c.add(decSum);
  c.add_u64((uint64_t)encLen);
  lb::report(ms, lb::hex8(c.value()));
}
