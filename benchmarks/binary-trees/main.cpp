// binary-trees — dựng rồi huỷ hàng loạt cây nhị phân. Đo chi phí cấp phát và thu hồi
// bộ nhớ theo cụm nhỏ, ngắn hạn — nơi bộ cấp phát và GC lộ rõ nhất sự khác nhau.
// binary-trees — build and tear down many binary trees. This measures the cost of
// small, short-lived allocations in bulk, where allocators and GCs differ most.
#include "common.hpp"

namespace {

struct Node {
  Node* l;
  Node* r;
};

// Cây cấp phát trên heap từng nút một — mục đích của bài test chính là chi phí đó.
// Nodes are heap-allocated one at a time: that cost is the point of the benchmark.
Node* build(int depth) {
  Node* n = new Node{nullptr, nullptr};
  if (depth > 0) {
    n->l = build(depth - 1);
    n->r = build(depth - 1);
  }
  return n;
}

uint64_t check(const Node* n) {
  if (!n->l) return 1;
  return 1 + check(n->l) + check(n->r);
}

void drop(Node* n) {
  if (n->l) { drop(n->l); drop(n->r); }
  delete n;
}

}  // namespace

int main(int argc, char** argv) {
  int maxDepth = (int)lb::param(argc, argv, "depth", 16);
  lb::Timer t;

  uint64_t total = 0;
  for (int d = 4; d <= maxDepth; d += 2) {
    // Cây càng nông thì dựng càng nhiều, để mỗi vòng làm lượng việc tương đương.
    // Shallower trees are built more often, so every round does comparable work.
    int iters = 1 << (maxDepth - d + 4);
    for (int i = 0; i < iters; ++i) {
      Node* n = build(d);
      total += check(n);
      drop(n);
    }
  }

  double ms = t.ms();
  lb::Checksum c;
  c.add_u64(total);
  lb::report(ms, lb::hex8(c.value()));
}
