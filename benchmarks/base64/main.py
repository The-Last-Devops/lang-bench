"""base64 — mã hoá rồi giải mã, tự viết bằng dịch bit và tra bảng.
Không dùng module base64: bốn ngôn ngữ phải chạy cùng một đoạn mã.

base64 — hand-written encode and decode over byte arrays.
The base64 module is deliberately unused: every language runs the same code."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_common"))
from common import Timer, Checksum, Lcg, param, report

MASK = 0xFFFFFFFF
ALPHA = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
EQ = 61

size = param("size", 3000000)

rng = Lcg(7)
src = bytearray(size)
for i in range(size):
    src[i] = (rng.next() >> 24) & 0xFF

rev = [-1] * 256
for i in range(64):
    rev[ALPHA[i]] = i

t = Timer()

enc_len = (size + 2) // 3 * 4
enc = bytearray(enc_len)
o = 0
for i in range(0, size, 3):
    v = src[i] << 16
    if i + 1 < size:
        v |= src[i + 1] << 8
    if i + 2 < size:
        v |= src[i + 2]
    enc[o] = ALPHA[(v >> 18) & 63]
    enc[o + 1] = ALPHA[(v >> 12) & 63]
    enc[o + 2] = ALPHA[(v >> 6) & 63] if i + 1 < size else EQ
    enc[o + 3] = ALPHA[v & 63] if i + 2 < size else EQ
    o += 4

dec = bytearray(size)
d = 0
for i in range(0, enc_len, 4):
    c0 = rev[enc[i]]
    c1 = rev[enc[i + 1]]
    c2 = -1 if enc[i + 2] == EQ else rev[enc[i + 2]]
    c3 = -1 if enc[i + 3] == EQ else rev[enc[i + 3]]
    v = (c0 << 18) | (c1 << 12)
    if c2 >= 0:
        v |= c2 << 6
    if c3 >= 0:
        v |= c3
    if d < size:
        dec[d] = (v >> 16) & 0xFF
        d += 1
    if c2 >= 0 and d < size:
        dec[d] = (v >> 8) & 0xFF
        d += 1
    if c3 >= 0 and d < size:
        dec[d] = v & 0xFF
        d += 1

enc_sum = 0
dec_sum = 0
for i in range(enc_len):
    enc_sum = (enc_sum + (i + 1) * enc[i]) & MASK
for i in range(d):
    dec_sum = (dec_sum + (i + 1) * dec[i]) & MASK

ms = t.ms()
c = Checksum()
c.add(enc_sum)
c.add(dec_sum)
c.add_u64(enc_len)
report(ms, c.hex())
