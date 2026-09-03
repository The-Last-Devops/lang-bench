"""alloc-gc — cấp rồi thả hàng triệu object nhỏ. Python đếm tham chiếu như PHP.
Dùng __slots__ vì đó là cách một dev Python viết node của danh sách liên kết;
không có __slots__ mỗi object phải mang thêm một dict.

alloc-gc — allocate and drop millions of small objects. Python refcounts, like PHP.
Uses __slots__ because that is how a Python developer writes a linked-list node;
without it every object carries an extra dict."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_common"))
from common import Timer, Checksum, Lcg, param, report


class Node:
    __slots__ = ("value", "next")

    def __init__(self, value, nxt):
        self.value = value
        self.next = nxt


batches = param("batches", 400)
per = param("per", 5000)
rng = Lcg(42)

t = Timer()
total = 0
for _ in range(batches):
    head = None
    for _ in range(per):
        head = Node(rng.next(), head)
    p = head
    while p is not None:
        total = (total + p.value) & 0xFFFFFFFF
        p = p.next
    head = None  # thả tham chiếu / drop the reference
ms = t.ms()

c = Checksum()
c.add(total)
c.add((batches * per) & 0xFFFFFFFF)
report(ms, c.hex())
