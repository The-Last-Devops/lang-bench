"""string-build — nối chuỗi và tự chuyển số sang thập phân.
Xem main.cpp để biết vì sao không dùng str() hay f-string.

string-build — appending and hand-rolled integer-to-decimal.
See main.cpp for why str() and f-strings are not used."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_common"))
from common import Timer, Checksum, param, report

MASK = 0xFFFFFFFF
DIGITS = "0123456789"

n = param("n", 400000)
t = Timer()

# Gom vào list rồi join: nối vào một str 400k lần sẽ tạo 400k chuỗi mới, và bài này đo
# phần dựng chuỗi nên phải dùng cách người ta thật sự viết trong Python.
# Collected in a list and joined: 400k appends to a str would build 400k new strings, and
# since this measures string building it has to use the way Python is actually written.
parts = []
for i in range(n):
    v = i % 1000
    d = ""
    while True:
        d = DIGITS[v % 10] + d
        v //= 10
        if v == 0:
            break
    parts.append(d)
    parts.append(",")
s = "".join(parts)

# Cộng có trọng số theo vị trí: đổi chỗ hai ký tự là checksum đổi.
# A position-weighted sum: swapping two characters changes it.
total = 0
for i, ch in enumerate(s):
    total = (total + (i + 1) * ord(ch)) & MASK

ms = t.ms()
c = Checksum()
c.add(total)
c.add_u64(len(s))
report(ms, c.hex())
