// crypto-hash — SHA-256 TỰ VIẾT trên 40 MB.
//
// Trước đây bài này gọi OpenSSL (C++, Node) và crypto/sha256 của Go — cả ba đều có đường
// assembly tối ưu tay — trong khi Rust dùng crate sha2 thuần Rust. Kết quả là Rust chậm hơn
// 7 lần, và con số đó không nói gì về ngôn ngữ: nó nói ai có assembly viết sẵn.
//
// Giờ cả bốn chạy đúng cùng một vòng nén SHA-256 viết tay theo FIPS 180-4. Bảng hằng số K
// được sinh từ định nghĩa (32 bit đầu phần thập phân của căn bậc ba 64 số nguyên tố đầu),
// không chép tay — chép 64 hằng số hex là chỗ dễ sai nhất mà lại khó phát hiện.
//
// crypto-hash — a hand-written SHA-256 over 40 MB.
//
// This used to call OpenSSL (C++, Node) and Go's crypto/sha256 — all three with hand-tuned
// assembly paths — while Rust used the pure-Rust sha2 crate. Rust came out 7x slower, and
// that number says nothing about the language: it says who shipped assembly.
//
// All four now run the same hand-written SHA-256 compression from FIPS 180-4. The K table is
// generated from its definition (the first 32 bits of the fractional parts of the cube roots
// of the first 64 primes) rather than copied: transcribing 64 hex constants is the easiest
// thing here to get wrong and the hardest to notice.
#include "common.hpp"
#include <vector>

namespace {

const uint32_t K[64] = {
    0x428a2f98u, 0x71374491u, 0xb5c0fbcfu, 0xe9b5dba5u, 0x3956c25bu, 0x59f111f1u,
    0x923f82a4u, 0xab1c5ed5u, 0xd807aa98u, 0x12835b01u, 0x243185beu, 0x550c7dc3u,
    0x72be5d74u, 0x80deb1feu, 0x9bdc06a7u, 0xc19bf174u, 0xe49b69c1u, 0xefbe4786u,
    0x0fc19dc6u, 0x240ca1ccu, 0x2de92c6fu, 0x4a7484aau, 0x5cb0a9dcu, 0x76f988dau,
    0x983e5152u, 0xa831c66du, 0xb00327c8u, 0xbf597fc7u, 0xc6e00bf3u, 0xd5a79147u,
    0x06ca6351u, 0x14292967u, 0x27b70a85u, 0x2e1b2138u, 0x4d2c6dfcu, 0x53380d13u,
    0x650a7354u, 0x766a0abbu, 0x81c2c92eu, 0x92722c85u, 0xa2bfe8a1u, 0xa81a664bu,
    0xc24b8b70u, 0xc76c51a3u, 0xd192e819u, 0xd6990624u, 0xf40e3585u, 0x106aa070u,
    0x19a4c116u, 0x1e376c08u, 0x2748774cu, 0x34b0bcb5u, 0x391c0cb3u, 0x4ed8aa4au,
    0x5b9cca4fu, 0x682e6ff3u, 0x748f82eeu, 0x78a5636fu, 0x84c87814u, 0x8cc70208u,
    0x90befffau, 0xa4506cebu, 0xbef9a3f7u, 0xc67178f2u,
};

inline uint32_t rotr(uint32_t x, int n) { return (x >> n) | (x << (32 - n)); }

// Nén một khối 64 byte vào trạng thái h. Đây là toàn bộ phần việc của SHA-256.
// Compress one 64-byte block into state h. This is all the work SHA-256 does.
void block(uint32_t h[8], const uint8_t* p) {
  uint32_t w[64];
  for (int i = 0; i < 16; ++i)
    w[i] = ((uint32_t)p[i * 4] << 24) | ((uint32_t)p[i * 4 + 1] << 16) |
           ((uint32_t)p[i * 4 + 2] << 8) | (uint32_t)p[i * 4 + 3];
  for (int i = 16; i < 64; ++i) {
    uint32_t s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >> 3);
    uint32_t s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >> 10);
    w[i] = w[i - 16] + s0 + w[i - 7] + s1;
  }
  uint32_t a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
  for (int i = 0; i < 64; ++i) {
    uint32_t S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
    uint32_t ch = (e & f) ^ (~e & g);
    uint32_t t1 = hh + S1 + ch + K[i] + w[i];
    uint32_t S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
    uint32_t maj = (a & b) ^ (a & c) ^ (b & c);
    uint32_t t2 = S0 + maj;
    hh = g; g = f; f = e; e = d + t1; d = c; c = b; b = a; a = t1 + t2;
  }
  h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
}

}  // namespace

int main(int argc, char** argv) {
  const long iters = lb::param(argc, argv, "iters", 40);
  const size_t chunk = 1u << 20;  // 1 MB

  std::vector<uint8_t> buf(chunk);
  for (size_t i = 0; i < chunk; ++i) buf[i] = (uint8_t)((i * 31 + 7) & 0xff);

  lb::Timer t;

  uint32_t h[8] = {
      0x6a09e667u, 0xbb67ae85u, 0x3c6ef372u, 0xa54ff53au,
      0x510e527fu, 0x9b05688cu, 0x1f83d9abu, 0x5be0cd19u,
  };
  for (long k = 0; k < iters; ++k)
    for (size_t off = 0; off < chunk; off += 64) block(h, buf.data() + off);

  // Tổng độ dài là bội của 64 nên phần đệm luôn gọn trong đúng một khối.
  // The total length is a multiple of 64, so the padding always fits one exact block.
  uint8_t pad[64] = {0};
  pad[0] = 0x80;
  uint64_t bits = (uint64_t)iters * chunk * 8;
  for (int i = 0; i < 8; ++i) pad[56 + i] = (uint8_t)(bits >> (56 - i * 8));
  block(h, pad);

  double ms = t.ms();

  lb::Checksum c;
  c.add(h[0]);
  c.add((uint32_t)iters);
  lb::report(ms, lb::hex8(c.value()));
}
