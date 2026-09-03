// crypto-hash — SHA-256 trên 200 MB. C++ không có SHA trong thư viện chuẩn nên dùng OpenSSL.
// crypto-hash — SHA-256 over 200 MB. C++ has no SHA in its standard library, so this uses OpenSSL.
#include "common.hpp"
#include <openssl/evp.h>
#include <vector>

int main(int argc, char** argv) {
  const long iters = lb::param(argc, argv, "iters", 200);
  const size_t chunk = 1u << 20;  // 1 MB

  std::vector<uint8_t> buf(chunk);
  for (size_t i = 0; i < chunk; ++i) buf[i] = (uint8_t)((i * 31 + 7) & 0xff);

  lb::Timer t;
  EVP_MD_CTX* ctx = EVP_MD_CTX_new();
  EVP_DigestInit_ex(ctx, EVP_sha256(), nullptr);
  for (long k = 0; k < iters; ++k) EVP_DigestUpdate(ctx, buf.data(), chunk);
  unsigned char digest[EVP_MAX_MD_SIZE];
  unsigned int digest_len = 0;
  EVP_DigestFinal_ex(ctx, digest, &digest_len);
  EVP_MD_CTX_free(ctx);
  double ms = t.ms();

  uint32_t head = ((uint32_t)digest[0] << 24) | ((uint32_t)digest[1] << 16) |
                  ((uint32_t)digest[2] << 8) | (uint32_t)digest[3];
  lb::Checksum c;
  c.add(head);
  c.add((uint32_t)iters);
  lb::report(ms, lb::hex8(c.value()));
}
