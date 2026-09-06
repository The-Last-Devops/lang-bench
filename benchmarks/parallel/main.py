"""parallel — CPython có GIL: luồng KHÔNG chạy song song cho việc CPU. Nó làm
đúng lượng việc đó trên một lõi, giống PHP. Bảng kết quả ghi rõ "1 luồng".
(Python 3.13 có bản free-threaded nhưng đó chưa phải bản mặc định.)

parallel — CPython has a GIL: threads do NOT run CPU work in parallel. It does the
same total work on one core, like PHP. The results table labels it "1 thread".
(Python 3.13 has a free-threaded build, but that is not the default build.)"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_common"))
from common import Timer, Checksum, Lcg, param, report


n = param("n", 256)
a = [0] * (n * n)
b = [0] * (n * n)
c = [0] * (n * n)
for i in range(n):
    for j in range(n):
        a[i * n + j] = (i * 31 + j * 17) % 100
        b[i * n + j] = (i * 13 + j * 7) % 100

t = Timer()
for i in range(n):
    for k in range(n):
        aik = a[i * n + k]
        for j in range(n):
            c[i * n + j] += aik * b[k * n + j]
total = 0
for v in c:
    total += v
ms = t.ms()

ck = Checksum()
ck.add_u64(total)
report(ms, ck.hex())
