# hashmap — chèn và tra cứu khóa chuỗi, đo Hash của Ruby.
# hashmap — insert and look up string keys, measuring Ruby's Hash.
require_relative '../_common/common'

n = lb_param('n', 1_000_000)
t = Timer.new
m = {}
i = 0
while i < n
  m["key#{i}"] = (i * 7) & MASK32
  i += 1
end

sum = 0
hits = 0
misses = 0
i = 0
while i < n
  v = m["key#{i}"]
  unless v.nil?
    hits += 1
    sum = (sum + v) & MASK32
  end
  i += 1
end
i = 0
half = n / 2
while i < half
  misses += 1 unless m.key?("nokey#{i}")
  i += 1
end
ms = t.ms

c = Checksum.new
c.add(sum)
c.add(hits)
c.add(misses)
lb_report(ms, c.hex)
