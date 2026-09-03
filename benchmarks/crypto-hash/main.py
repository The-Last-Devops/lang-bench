"""crypto-hash — SHA-256 trên 200 MB. hashlib gọi vào OpenSSL.
crypto-hash — SHA-256 over 200 MB. hashlib calls into OpenSSL."""
import hashlib

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_common"))
from common import Timer, Checksum, Lcg, param, report


iters = param("iters", 200)
chunk = 1 << 20

buf = bytes(((i * 31 + 7) & 0xFF) for i in range(chunk))

t = Timer()
h = hashlib.sha256()
for _ in range(iters):
    h.update(buf)
digest = h.digest()
ms = t.ms()

head = (digest[0] << 24) | (digest[1] << 16) | (digest[2] << 8) | digest[3]
c = Checksum()
c.add(head)
c.add(iters)
report(ms, c.hex())
