// startup — in một dòng rồi thoát. KHÔNG dùng helper chung: bài này đo đúng
// chi phí khởi động, nên mọi thứ thêm vào đều làm sai số liệu.
// startup — print one line and exit. Deliberately does NOT use the shared helpers:
// this measures startup cost itself, so anything extra would distort it.
#include <cstdio>

int main() {
  printf("{\"ms\": 0.000, \"checksum\": \"00000001\"}\n");
  return 0;
}
