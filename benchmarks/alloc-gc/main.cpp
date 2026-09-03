// alloc-gc — cấp rồi thả hàng triệu object nhỏ. C++ không có GC: tự new/delete.
// alloc-gc — allocate and drop millions of small objects. C++ has no GC: new/delete by hand.
#include "common.hpp"

struct Node {
  uint32_t value;
  Node* next;
};

int main(int argc, char** argv) {
  const long batches = lb::param(argc, argv, "batches", 400);
  const long per = lb::param(argc, argv, "per", 5000);
  lb::Lcg rng(42);

  lb::Timer t;
  uint32_t total = 0;
  for (long b = 0; b < batches; ++b) {
    Node* head = nullptr;
    for (long i = 0; i < per; ++i) {
      Node* n = new Node{rng.next(), head};
      head = n;
    }
    for (Node* p = head; p != nullptr; p = p->next) total = (uint32_t)(total + p->value);
    while (head != nullptr) {  // thả theo vòng lặp, tránh đệ quy sâu / iterative free
      Node* next = head->next;
      delete head;
      head = next;
    }
  }
  double ms = t.ms();

  lb::Checksum c;
  c.add(total);
  c.add((uint32_t)(batches * per));
  lb::report(ms, lb::hex8(c.value()));
}
