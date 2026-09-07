// lru-cache — cache LRU TỰ VIẾT: bảng băm cộng danh sách liên kết đôi trên mảng phẳng.
//
// Khác `hashmap` ở chỗ có XOÁ. Bảng băm chỉ chèn thì ô trống chứng minh khoá vắng mặt; có
// xoá thì không còn đúng, nên ở đây dùng dây xích qua chỉ số thay vì địa chỉ mở. Cộng thêm
// việc mỗi lần truy cập phải nối lại danh sách — đó là hình dạng của cache thật.
//
// Danh sách nằm trên MẢNG PHẲNG với chỉ số thay cho con trỏ: bốn ngôn ngữ đều làm được y
// hệt, và bài này đo việc nối lại danh sách chứ không đo bộ cấp phát.
//
// lru-cache — a hand-written LRU cache: a hash table plus a doubly linked list over flat arrays.
//
// Unlike `hashmap`, this one DELETES. An insert-only table can treat an empty slot as proof a
// key is absent; with deletion that no longer holds, so this uses chaining through indices
// rather than open addressing. On top of that every access relinks the list — the shape of a
// real cache.
//
// The list lives in FLAT ARRAYS with indices instead of pointers: all four languages can do
// exactly the same thing, and this measures the relinking rather than the allocator.
#include "common.hpp"
#include <vector>

int main(int argc, char** argv) {
  const long cap = lb::param(argc, argv, "cap", 100000);
  const long ops = lb::param(argc, argv, "ops", 2000000);
  const uint32_t space = (uint32_t)(cap * 3);

  // Dãy khoá sinh trước, ngoài đồng hồ, nên bốn ngôn ngữ nhận đúng cùng chuỗi thao tác.
  // The key sequence is generated up front, outside the clock, so every language performs
  // exactly the same operations.
  std::vector<uint32_t> keys((size_t)ops);
  lb::Lcg rng(31u);
  for (long i = 0; i < ops; ++i) keys[(size_t)i] = rng.next() % space;

  size_t buckets = 1;
  while (buckets < (size_t)cap * 2) buckets *= 2;
  const uint32_t mask = (uint32_t)(buckets - 1);

  std::vector<int32_t> head(buckets, -1);   // đầu dây xích mỗi rổ / chain head per bucket
  std::vector<int32_t> next((size_t)cap, -1);
  std::vector<uint32_t> key((size_t)cap, 0);
  std::vector<uint32_t> val((size_t)cap, 0);
  std::vector<int32_t> prevL((size_t)cap, -1);
  std::vector<int32_t> nextL((size_t)cap, -1);
  int32_t lruHead = -1, lruTail = -1, used = 0;

  lb::Timer t;

  uint32_t hits = 0, misses = 0, sum = 0;

  for (long i = 0; i < ops; ++i) {
    const uint32_t k = keys[(size_t)i];
    const uint32_t b = (k * 2654435761u) & mask;

    int32_t node = head[b];
    while (node >= 0 && key[(size_t)node] != k) node = next[(size_t)node];

    if (node >= 0) {
      ++hits;
      sum += val[(size_t)node];
      // Đưa lên đầu: tháo khỏi vị trí cũ rồi nối vào đầu.
      // Move to front: unlink from where it is, then link at the head.
      if (lruHead != node) {
        const int32_t p = prevL[(size_t)node], nx = nextL[(size_t)node];
        if (p >= 0) nextL[(size_t)p] = nx;
        if (nx >= 0) prevL[(size_t)nx] = p;
        if (lruTail == node) lruTail = p;
        prevL[(size_t)node] = -1;
        nextL[(size_t)node] = lruHead;
        if (lruHead >= 0) prevL[(size_t)lruHead] = node;
        lruHead = node;
      }
      continue;
    }

    ++misses;
    int32_t slot;
    if (used < cap) {
      slot = used++;
    } else {
      // Đầy: đuổi phần tử ở cuối, tháo nó khỏi rổ cũ.
      // Full: evict the tail and unlink it from its old bucket.
      slot = lruTail;
      const uint32_t ob = (key[(size_t)slot] * 2654435761u) & mask;
      int32_t cur = head[ob], prev = -1;
      while (cur >= 0 && cur != slot) { prev = cur; cur = next[(size_t)cur]; }
      if (prev >= 0) next[(size_t)prev] = next[(size_t)slot];
      else head[ob] = next[(size_t)slot];

      const int32_t p = prevL[(size_t)slot];
      if (p >= 0) nextL[(size_t)p] = -1;
      lruTail = p;
      if (lruHead == slot) lruHead = -1;
    }

    key[(size_t)slot] = k;
    val[(size_t)slot] = k * 2u + 1u;
    next[(size_t)slot] = head[b];
    head[b] = slot;

    prevL[(size_t)slot] = -1;
    nextL[(size_t)slot] = lruHead;
    if (lruHead >= 0) prevL[(size_t)lruHead] = slot;
    lruHead = slot;
    if (lruTail < 0) lruTail = slot;
  }

  double ms = t.ms();

  lb::Checksum c;
  c.add(hits);
  c.add(misses);
  c.add(sum);
  lb::report(ms, lb::hex8(c.value()));
}
