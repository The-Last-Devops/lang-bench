"""sort-objects — merge sort đáy-lên TỰ VIẾT trên mảng bản ghi, so theo khoá (key, id).
Xem main.cpp để biết vì sao không dùng list.sort().

sort-objects — a hand-written bottom-up merge sort over records, keyed on (key, id).
See main.cpp for why list.sort() is not used."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_common"))
from common import Timer, Checksum, Lcg, param, report

MASK = 0xFFFFFFFF

n = param("n", 400000)

# Hai list phẳng song song thay vì list các tuple: tạo 400k tuple sẽ biến bài này thành phép
# đo bộ cấp phát, mà đó đã là việc của binary-trees.
# Two parallel flat lists instead of a list of tuples: allocating 400k tuples would turn this
# into an allocator benchmark, which is binary-trees' job.
rng = Lcg(99)
key = [0] * n
idx = [0] * n
for i in range(n):
    key[i] = rng.next()
    idx[i] = i
bk = [0] * n
bi = [0] * n

t = Timer()

width = 1
while width < n:
    lo = 0
    while lo < n:
        mid = min(lo + width, n)
        hi = min(lo + width * 2, n)
        i, j, k = lo, mid, lo
        while i < mid and j < hi:
            if key[j] != key[i]:
                take_j = key[j] < key[i]
            else:
                take_j = idx[j] < idx[i]
            if take_j:
                bk[k] = key[j]
                bi[k] = idx[j]
                j += 1
            else:
                bk[k] = key[i]
                bi[k] = idx[i]
                i += 1
            k += 1
        while i < mid:
            bk[k] = key[i]
            bi[k] = idx[i]
            i += 1
            k += 1
        while j < hi:
            bk[k] = key[j]
            bi[k] = idx[j]
            j += 1
            k += 1
        lo += width * 2
    # Đổi vai hai cặp list sau mỗi vòng, không chép ngược lại.
    # The two pairs swap roles after each pass; nothing is copied back.
    key, bk = bk, key
    idx, bi = bi, idx
    width *= 2

total = 0
for i in range(n):
    total = (total + (i + 1) * (key[i] ^ idx[i])) & MASK

ms = t.ms()
c = Checksum()
c.add(total)
c.add(key[0])
c.add(key[n - 1])
report(ms, c.hex())
