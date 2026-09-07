"""lru-cache — cache LRU TỰ VIẾT: bảng băm cộng danh sách liên kết đôi trên list phẳng.
Không dùng OrderedDict hay dict (Python 3.7+ vốn giữ thứ tự chèn) — đó lại là so thư viện.
Xem main.cpp để biết vì sao dùng dây xích thay cho địa chỉ mở.

lru-cache — a hand-written LRU cache over flat lists. Neither OrderedDict nor a plain dict is
used, even though Python 3.7+ preserves insertion order: that would compare libraries.
See main.cpp for why this chains instead of open-addressing."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_common"))
from common import Timer, Checksum, Lcg, param, report

MASK = 0xFFFFFFFF

cap = param("cap", 100000)
ops = param("ops", 2000000)
space = cap * 3

# Dãy khoá sinh trước, ngoài đồng hồ, nên mọi ngôn ngữ thực hiện đúng cùng chuỗi thao tác.
# The key sequence is generated up front, outside the clock, so every language performs
# exactly the same operations.
rng = Lcg(31)
keys = [0] * ops
for i in range(ops):
    keys[i] = rng.next() % space

buckets = 1
while buckets < cap * 2:
    buckets *= 2
mask = buckets - 1

head = [-1] * buckets
nxt = [-1] * cap
key = [0] * cap
val = [0] * cap
prev_l = [-1] * cap
next_l = [-1] * cap
lru_head = -1
lru_tail = -1
used = 0

t = Timer()

hits = 0
misses = 0
total = 0

for i in range(ops):
    k = keys[i]
    b = ((k * 2654435761) & MASK) & mask

    node = head[b]
    while node >= 0 and key[node] != k:
        node = nxt[node]

    if node >= 0:
        hits += 1
        total = (total + val[node]) & MASK
        # Đưa lên đầu: tháo khỏi vị trí cũ rồi nối vào đầu.
        # Move to front: unlink from where it is, then link at the head.
        if lru_head != node:
            p = prev_l[node]
            nx = next_l[node]
            if p >= 0:
                next_l[p] = nx
            if nx >= 0:
                prev_l[nx] = p
            if lru_tail == node:
                lru_tail = p
            prev_l[node] = -1
            next_l[node] = lru_head
            if lru_head >= 0:
                prev_l[lru_head] = node
            lru_head = node
        continue

    misses += 1
    if used < cap:
        slot = used
        used += 1
    else:
        # Đầy: đuổi phần tử ở cuối, tháo nó khỏi rổ cũ.
        # Full: evict the tail and unlink it from its old bucket.
        slot = lru_tail
        ob = ((key[slot] * 2654435761) & MASK) & mask
        cur = head[ob]
        prev = -1
        while cur >= 0 and cur != slot:
            prev = cur
            cur = nxt[cur]
        if prev >= 0:
            nxt[prev] = nxt[slot]
        else:
            head[ob] = nxt[slot]

        p = prev_l[slot]
        if p >= 0:
            next_l[p] = -1
        lru_tail = p
        if lru_head == slot:
            lru_head = -1

    key[slot] = k
    val[slot] = (k * 2 + 1) & MASK
    nxt[slot] = head[b]
    head[b] = slot

    prev_l[slot] = -1
    next_l[slot] = lru_head
    if lru_head >= 0:
        prev_l[lru_head] = slot
    lru_head = slot
    if lru_tail < 0:
        lru_tail = slot

ms = t.ms()
c = Checksum()
c.add(hits)
c.add(misses)
c.add(total)
report(ms, c.hex())
