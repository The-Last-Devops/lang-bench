"""primes — sàng Eratosthenes, đo vòng lặp chặt trên mảng byte lớn.
primes — sieve of Eratosthenes, measuring tight loops over a large byte array."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_common"))
from common import Timer, Checksum, Lcg, param, report


n = param("n", 10000000)
t = Timer()
composite = bytearray(n + 1)
i = 2
while i * i <= n:
    if composite[i] == 0:
        for j in range(i * i, n + 1, i):
            composite[j] = 1
    i += 1

count = 0
total = 0
for i in range(2, n + 1):
    if composite[i] == 0:
        count += 1
        total = (total + i) & 0xFFFFFFFF
ms = t.ms()

c = Checksum()
c.add(count)
c.add(total)
report(ms, c.hex())
