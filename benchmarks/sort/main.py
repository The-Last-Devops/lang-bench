"""sort — sắp xếp 3 triệu số nguyên bằng list.sort() (Timsort viết bằng C).
sort — sort 3 million integers with list.sort() (Timsort, implemented in C)."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_common"))
from common import Timer, Checksum, Lcg, param, report


n = param("n", 3000000)
rng = Lcg(42)
v = [rng.next() for _ in range(n)]

t = Timer()
v.sort()
ms = t.ms()

total = 0
for i in range(0, n, 1000):
    total = (total + v[i]) & 0xFFFFFFFF
c = Checksum()
c.add(v[0])
c.add(v[n - 1])
c.add(total)
report(ms, c.hex())
