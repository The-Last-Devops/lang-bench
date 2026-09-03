"""json — dựng 100k record, serialize, parse lại, đọc số liệu.
Module json của Python có phần tăng tốc viết bằng C.
json — build 100k records, serialize, parse back, read fields.
Python's json module has a C accelerator underneath."""
import json as jsonlib

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_common"))
from common import Timer, Checksum, Lcg, param, report


n = param("n", 100000)

t = Timer()
docs = [None] * n
for i in range(n):
    docs[i] = {"id": i, "name": "user" + str(i), "score": (i * 37) % 1000, "active": i % 3 == 0}
text = jsonlib.dumps(docs, separators=(",", ":"))
back = jsonlib.loads(text)

sum_id = 0
sum_score = 0
active = 0
for rec in back:
    sum_id = (sum_id + rec["id"]) & 0xFFFFFFFF
    sum_score = (sum_score + rec["score"]) & 0xFFFFFFFF
    if rec["active"]:
        active += 1
ms = t.ms()

c = Checksum()
c.add(sum_id)
c.add(sum_score)
c.add(active)
c.add(len(text))
report(ms, c.hex())
