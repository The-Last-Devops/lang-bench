// file-io — ghi tuần tự rồi đọc lại 256 MB. Đo I/O đĩa, không đo CPU.
// file-io — write then read back 256 MB sequentially. This measures disk I/O, not CPU.
#include "common.hpp"
#include <cstdio>
#include <cstdlib>
#include <fcntl.h>
#include <unistd.h>
#include <vector>

int main(int argc, char** argv) {
  const long mb = lb::param(argc, argv, "mb", 256);
  const size_t chunk = 1u << 20;
  const char* dir = getenv("LB_TMPDIR");
  std::string path = std::string(dir ? dir : "/tmp") + "/lang-bench-io-cpp.bin";

  // Buffer dựng MỘT LẦN, trước đồng hồ: bài này phải đo I/O, không đo việc tạo dữ liệu.
  // Buffer built ONCE, before the clock: this benchmark must measure I/O, not data generation.
  std::vector<uint8_t> buf(chunk);
  for (size_t j = 0; j < chunk; ++j) buf[j] = (uint8_t)((j * 31 + 7) & 0xff);

  lb::Timer t;
  int fd = open(path.c_str(), O_WRONLY | O_CREAT | O_TRUNC, 0644);
  if (fd < 0) { perror("open write"); return 1; }
  for (long k = 0; k < mb; ++k)
    if (write(fd, buf.data(), chunk) != (ssize_t)chunk) { perror("write"); return 1; }
  fsync(fd);
  close(fd);

  // Chỉ cộng 4 KB đầu mỗi chunk để xác minh — cộng đủ 256 MB byte sẽ biến bài này
  // thành bài đo vòng lặp của ngôn ngữ chứ không còn đo I/O.
  // Verify by summing only the first 4 KB of each chunk — summing all 256 MB would turn
  // this into a language-loop benchmark instead of an I/O one.
  const size_t sample = 4096;
  uint32_t sum = 0;
  uint64_t total_read = 0;
  fd = open(path.c_str(), O_RDONLY);
  if (fd < 0) { perror("open read"); return 1; }
  for (long k = 0; k < mb; ++k) {
    size_t got = 0;
    while (got < chunk) {
      ssize_t r = read(fd, buf.data() + got, chunk - got);
      if (r <= 0) break;
      got += (size_t)r;
    }
    total_read += got;
    const size_t lim = got < sample ? got : sample;
    for (size_t j = 0; j < lim; ++j) sum = (uint32_t)(sum + buf[j]);
  }
  close(fd);
  double ms = t.ms();
  unlink(path.c_str());

  lb::Checksum c;
  c.add(sum);
  c.add((uint32_t)(total_read >> 20));
  c.add((uint32_t)mb);
  lb::report(ms, lb::hex8(c.value()));
}
