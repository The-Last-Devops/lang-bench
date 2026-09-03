"""fib — đệ quy thuần, đo chi phí gọi hàm và stack.
fib — plain recursion, measuring call and stack cost."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_common"))
from common import Timer, Checksum, Lcg, param, report


def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)


n = param("n", 32)
t = Timer()
v = fib(n)
ms = t.ms()
c = Checksum()
c.add(v & 0xFFFFFFFF)
report(ms, c.hex())
