"""matmul — nhân ma trận N×N kiểu ngây thơ, Python thuần (không numpy).
numpy sẽ nhanh hơn cả trăm lần, nhưng đó là gọi vào thư viện C — không còn so
sánh ngôn ngữ nữa. Ghi chú của bài này nói rõ điều đó.

matmul — naive N×N matrix multiply in pure Python (no numpy). numpy would be a
hundred times faster, but that is calling into a C library, which stops being a
language comparison. The benchmark note says so."""
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
