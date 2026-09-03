// fib — đệ quy thuần, đo chi phí gọi hàm và stack.
// fib — plain recursion, measuring call and stack cost.
#include "common.hpp"

static uint64_t fib(int n) { return n < 2 ? (uint64_t)n : fib(n - 1) + fib(n - 2); }

int main(int argc, char** argv) {
  int n = (int)lb::param(argc, argv, "n", 32);
  lb::Timer t;
  uint64_t v = fib(n);
  double ms = t.ms();
  lb::Checksum c;
  c.add((uint32_t)(v & 0xffffffffu));
  lb::report(ms, lb::hex8(c.value()));
}
