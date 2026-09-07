"""dijkstra — đường đi ngắn nhất trên đồ thị thưa, heap nhị phân TỰ VIẾT.
Xem main.cpp để biết vì sao không dùng heapq.

dijkstra — shortest paths over a sparse graph with a hand-written binary heap.
See main.cpp for why heapq is not used."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_common"))
from common import Timer, Checksum, Lcg, param, report

n = param("n", 200000)
deg = param("deg", 8)

# Đồ thị dạng CSR từ cùng một LCG, nên bốn ngôn ngữ nhận đúng cùng đồ thị. Phần dựng nằm
# ngoài đồng hồ — bài này đo tìm đường, không đo sinh dữ liệu.
# A CSR graph from the same LCG, so every language sees the same graph. Construction sits
# outside the clock: this measures the search, not the data generation.
rng = Lcg(12345)
head = [i * deg for i in range(n + 1)]
m = n * deg
to = [0] * m
w = [0] * m
for i in range(m):
    to[i] = rng.next() % n
    w[i] = 1 + rng.next() % 1000

t = Timer()

INF = float("inf")
dist = [INF] * n

# Heap nhị phân trên hai list phẳng, lười xoá: một đỉnh có thể vào heap nhiều lần, lần lấy
# ra đầu tiên đã là ngắn nhất.
# A binary heap over two flat lists with lazy deletion: a node may be pushed several times
# and the first pop is already the shortest.
hd = [0]
hv = [0]
hn = 1
dist[0] = 0

while hn > 0:
    d = hd[0]
    u = hv[0]

    hn -= 1
    hd[0] = hd[hn]
    hv[0] = hv[hn]
    i = 0
    while True:
        l = i * 2 + 1
        r = l + 1
        best = i
        if l < hn and hd[l] < hd[best]:
            best = l
        if r < hn and hd[r] < hd[best]:
            best = r
        if best == i:
            break
        hd[best], hd[i] = hd[i], hd[best]
        hv[best], hv[i] = hv[i], hv[best]
        i = best

    if d > dist[u]:
        continue  # bản cũ đã lỗi thời / a stale copy

    for e in range(head[u], head[u + 1]):
        nd = d + w[e]
        v = to[e]
        if nd < dist[v]:
            dist[v] = nd
            if hn < len(hd):
                hd[hn] = nd
                hv[hn] = v
            else:
                hd.append(nd)
                hv.append(v)
            i = hn
            hn += 1
            while i > 0:
                p = (i - 1) // 2
                if hd[p] <= hd[i]:
                    break
                hd[p], hd[i] = hd[i], hd[p]
                hv[p], hv[i] = hv[i], hv[p]
                i = p

total = 0
reach = 0
for d in dist:
    if d != INF:
        total += d
        reach += 1

ms = t.ms()
c = Checksum()
c.add_u64(total)
c.add_u64(reach)
report(ms, c.hex())
