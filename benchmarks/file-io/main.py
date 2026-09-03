"""file-io — ghi tuần tự rồi đọc lại 256 MB. Đo I/O đĩa, không đo CPU.
file-io — write then read back 256 MB sequentially. This measures disk I/O, not CPU."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_common"))
from common import Timer, Checksum, Lcg, param, report


mb = param("mb", 256)
chunk = 1 << 20
directory = os.environ.get("LB_TMPDIR") or "/tmp"
path = os.path.join(directory, "lang-bench-io-python.bin")

# Buffer dựng MỘT LẦN, trước đồng hồ. / Buffer built ONCE, before the clock.
buf = bytes(((j * 31 + 7) & 0xFF) for j in range(chunk))

t = Timer()
fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
for _ in range(mb):
    os.write(fd, buf)
os.fsync(fd)
os.close(fd)

# Chỉ cộng 4 KB đầu mỗi chunk để xác minh — xem ghi chú ở main.cpp.
# Verify by summing only the first 4 KB of each chunk — see the note in main.cpp.
SAMPLE = 4096
total = 0
total_read = 0
fd = os.open(path, os.O_RDONLY)
for _ in range(mb):
    data = os.read(fd, chunk)
    if not data:
        break
    total_read += len(data)
    for byte in data[:SAMPLE]:
        total = (total + byte) & 0xFFFFFFFF
os.close(fd)
ms = t.ms()
os.unlink(path)

c = Checksum()
c.add(total)
c.add(total_read >> 20)
c.add(mb)
report(ms, c.hex())
