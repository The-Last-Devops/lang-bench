"""virtual-call — gọi phương thức trên list trộn lẫn bốn lớp.
Xem main.cpp để biết vì sao list phải trộn lẫn.

virtual-call — method dispatch over a list of four mixed classes.
See main.cpp for why the list must be mixed."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_common"))
from common import Timer, Checksum, Lcg, param, report

MASK = 0xFFFFFFFF


# __slots__ để đối tượng không mang __dict__: bài này đo chi phí ĐIỀU PHỐI, còn chi phí bộ
# nhớ của object là việc của binary-trees.
# __slots__ keeps a __dict__ off each object: this measures DISPATCH, while an object's
# memory cost is binary-trees' concern.
class Square:
    __slots__ = ("a",)

    def __init__(self, a):
        self.a = a

    def area(self):
        return (self.a * self.a) & MASK


class Rect:
    __slots__ = ("a", "b")

    def __init__(self, a, b):
        self.a = a
        self.b = b

    def area(self):
        return (self.a * self.b) & MASK


class Tri:
    __slots__ = ("a", "b")

    def __init__(self, a, b):
        self.a = a
        self.b = b

    def area(self):
        return ((self.a * self.b) & MASK) // 2


class Line:
    __slots__ = ("a",)

    def __init__(self, a):
        self.a = a

    def area(self):
        return self.a


n = param("n", 1000000)
passes = param("passes", 20)

rng = Lcg(5)
v = [None] * n
for i in range(n):
    kind = rng.next() % 4
    a = rng.next() % 1000
    b = rng.next() % 1000
    if kind == 0:
        v[i] = Square(a)
    elif kind == 1:
        v[i] = Rect(a, b)
    elif kind == 2:
        v[i] = Tri(a, b)
    else:
        v[i] = Line(a)

t = Timer()
total = 0
for _ in range(passes):
    for s in v:
        total = (total + s.area()) & MASK
ms = t.ms()

c = Checksum()
c.add(total)
c.add(passes)
report(ms, c.hex())
