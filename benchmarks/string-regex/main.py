"""string-regex — khớp regex trên 200k dòng log. Module re viết bằng C.
string-regex — match a regex over 200k log lines. The re module is written in C."""
import re

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_common"))
from common import Timer, Checksum, Lcg, param, report

PATTERN = re.compile(
    r'^(\d+\.\d+\.\d+\.\d+) - \[([0-9-]+)\] "(GET|POST) (\S+) HTTP/1\.1" (\d{3}) (\d+)$'
)

n = param("n", 200000)

lines = [None] * n
rng = Lcg(42)
for i in range(n):
    a = rng.next() % 256
    b = rng.next() % 256
    day = rng.next() % 28 + 1
    post = rng.next() % 4 == 0
    status = 200
    if rng.next() % 10 >= 8:
        status = 404 if rng.next() % 2 == 1 else 500
    nbytes = rng.next() % 100000
    lines[i] = '10.0.%d.%d - [2026-08-%02d] "%s /path/%d HTTP/1.1" %d %d' % (
        a, b, day, "POST" if post else "GET", i, status, nbytes)

t = Timer()
sum_bytes = 0
ok200 = 0
posts = 0
matched = 0
for line in lines:
    m = PATTERN.match(line)
    if m is not None:
        matched += 1
        if m.group(3) == "POST":
            posts += 1
        if int(m.group(5)) == 200:
            ok200 += 1
        sum_bytes = (sum_bytes + int(m.group(6))) & 0xFFFFFFFF
ms = t.ms()

c = Checksum()
c.add(sum_bytes)
c.add(ok200)
c.add(posts)
c.add(matched)
report(ms, c.hex())
