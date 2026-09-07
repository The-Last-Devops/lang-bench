"""binary-trees — dựng rồi huỷ hàng loạt cây nhỏ, ngắn hạn.
Đo bộ cấp phát và bộ thu hồi bộ nhớ.

binary-trees — building and discarding many small, short-lived trees:
allocator and reclamation pressure."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_common"))
from common import Timer, Checksum, param, report

sys.setrecursionlimit(100000)


# Tuple hai phần tử, lá là (None, None). Đây là cấu trúc nhẹ nhất trong Python cho cây này;
# một class sẽ thêm chi phí __dict__ vào đúng thứ bài test đang đo.
# Two-element tuples with (None, None) as the leaf: the lightest structure Python has for
# this tree. A class would add __dict__ overhead to the very thing being measured.
def build(depth):
    if depth > 0:
        return (build(depth - 1), build(depth - 1))
    return (None, None)


def check(node):
    if node[0] is None:
        return 1
    return 1 + check(node[0]) + check(node[1])


max_depth = param("depth", 16)
t = Timer()

total = 0
d = 4
while d <= max_depth:
    iters = 1 << (max_depth - d + 4)
    for _ in range(iters):
        total += check(build(d))
    d += 2

ms = t.ms()
c = Checksum()
c.add_u64(total)
report(ms, c.hex())
