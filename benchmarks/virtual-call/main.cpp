// virtual-call — gọi hàm ảo qua một mảng đối tượng trộn lẫn bốn kiểu.
//
// Chưa bài test nào đo thứ này, mà nó lại là hình dạng của rất nhiều code thật: một danh
// sách đối tượng khác kiểu, gọi cùng một phương thức. Điểm quan trọng là mảng được TRỘN
// LẪN nên chỗ gọi là megamorphic — trình biên dịch không đoán được đích, và mọi cơ chế
// đoán nhánh đều thất bại. Mảng cùng một kiểu sẽ bị tối ưu thành gọi trực tiếp và bài test
// mất hết ý nghĩa.
//
// Đối tượng dựng NGOÀI đồng hồ: chi phí cấp phát là việc của binary-trees.
//
// virtual-call — virtual dispatch over an array holding four mixed object kinds.
//
// Nothing else here measures this, and it is the shape of a great deal of real code: a list
// of unlike objects, one method called on each. The array is deliberately MIXED so the call
// site is megamorphic — the compiler cannot predict the target and branch prediction fails.
// An array of one kind would be devirtualised and the benchmark would mean nothing.
//
// The objects are built OUTSIDE the clock: allocation cost is binary-trees' job.
#include "common.hpp"
#include <memory>
#include <vector>

namespace {

struct Shape {
  virtual ~Shape() = default;
  virtual uint32_t area() const = 0;
};

struct Square : Shape {
  uint32_t a;
  explicit Square(uint32_t a) : a(a) {}
  uint32_t area() const override { return a * a; }
};
struct Rect : Shape {
  uint32_t a, b;
  Rect(uint32_t a, uint32_t b) : a(a), b(b) {}
  uint32_t area() const override { return a * b; }
};
struct Tri : Shape {
  uint32_t a, b;
  Tri(uint32_t a, uint32_t b) : a(a), b(b) {}
  uint32_t area() const override { return a * b / 2; }
};
struct Line : Shape {
  uint32_t a;
  explicit Line(uint32_t a) : a(a) {}
  uint32_t area() const override { return a; }
};

}  // namespace

int main(int argc, char** argv) {
  const long n = lb::param(argc, argv, "n", 1000000);
  const long passes = lb::param(argc, argv, "passes", 20);

  std::vector<std::unique_ptr<Shape>> v;
  v.reserve((size_t)n);
  lb::Lcg rng(5u);
  for (long i = 0; i < n; ++i) {
    uint32_t kind = rng.next() % 4u;
    uint32_t a = rng.next() % 1000u;
    uint32_t b = rng.next() % 1000u;
    switch (kind) {
      case 0: v.emplace_back(new Square(a)); break;
      case 1: v.emplace_back(new Rect(a, b)); break;
      case 2: v.emplace_back(new Tri(a, b)); break;
      default: v.emplace_back(new Line(a)); break;
    }
  }

  lb::Timer t;
  uint32_t sum = 0;
  for (long p = 0; p < passes; ++p)
    for (const auto& s : v) sum += s->area();
  double ms = t.ms();

  lb::Checksum c;
  c.add(sum);
  c.add((uint32_t)passes);
  lb::report(ms, lb::hex8(c.value()));
}
