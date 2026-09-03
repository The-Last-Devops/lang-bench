"""hashmap — chèn và tra cứu khóa chuỗi, đo dict của Python.
hashmap — insert and look up string keys, measuring Python's dict."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_common"))
from common import Timer, Checksum, Lcg, param, report


n = param("n", 1000000)
t = Timer()
m = {}
for i in range(n):
    m["key" + str(i)] = (i * 7) & 0xFFFFFFFF

total = 0
hits = 0
misses = 0
for i in range(n):
    v = m.get("key" + str(i))
    if v is not None:
        hits += 1
        total = (total + v) & 0xFFFFFFFF
for i in range(n // 2):
    if "nokey" + str(i) not in m:
        misses += 1
ms = t.ms()

c = Checksum()
c.add(total)
c.add(hits)
c.add(misses)
report(ms, c.hex())
