"""utf8 — dựng chuỗi nhiều ngôn ngữ rồi duyệt từng điểm mã.

Python 3 là ngôn ngữ duy nhất ở đây có kiểu str thật sự theo điểm mã, không phải byte hay
UTF-16 — nên nó không phải ghép cặp thay thế như JS, cũng không phải giải mã tay như C++.

utf8 — build a multilingual string, then walk it code point by code point.

Python 3 is the only language here whose str is genuinely indexed by code point rather than
bytes or UTF-16 units, so it neither recombines surrogate pairs like JS nor decodes by hand
like C++."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_common"))
from common import Timer, Checksum, Lcg, param, report

MASK = 0xFFFFFFFF

n = param("n", 6000000)

# Bốn dải: ASCII 1 byte, Latin 2 byte, CJK 3 byte, ký hiệu 4 byte khi mã hoá UTF-8.
# Four ranges: ASCII at 1 byte, Latin at 2, CJK at 3, symbols at 4 once encoded as UTF-8.
rng = Lcg(2024)
cps = [0] * n
nbytes = 0
for i in range(n):
    r = rng.next()
    k = r & 3
    if k == 0:
        cp = 0x20 + ((r >> 8) % 95)
    elif k == 1:
        cp = 0xC0 + ((r >> 8) % 64)
    elif k == 2:
        cp = 0x4E00 + ((r >> 8) % 0x5000)
    else:
        cp = 0x1F300 + ((r >> 8) % 0x300)
    cps[i] = cp
    nbytes += 1 if cp < 0x80 else 2 if cp < 0x800 else 3 if cp < 0x10000 else 4

s = "".join(map(chr, cps))

t = Timer()

total = 0
wide = 0
idx = 0
for ch in s:
    cp = ord(ch)
    idx += 1
    total = (total + idx * cp) & MASK
    if cp > 0x7F:
        wide += 1

ms = t.ms()
c = Checksum()
c.add(total)
c.add(wide)
c.add(idx)
c.add_u64(nbytes)
report(ms, c.hex())
