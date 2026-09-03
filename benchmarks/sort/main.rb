# sort — sắp xếp 3 triệu số nguyên bằng Array#sort! (viết bằng C).
# sort — sort 3 million integers with Array#sort! (implemented in C).
require_relative '../_common/common'

n = lb_param('n', 3_000_000)
rng = Lcg.new(42)
v = Array.new(n) { rng.next }

t = Timer.new
v.sort!
ms = t.ms

sum = 0
i = 0
while i < n
  sum = (sum + v[i]) & MASK32
  i += 1000
end
c = Checksum.new
c.add(v[0])
c.add(v[n - 1])
c.add(sum)
lb_report(ms, c.hex)
