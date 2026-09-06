# parallel — Ruby (CRuby) có GVL: Thread KHÔNG chạy song song cho việc CPU.
# Nó làm đúng lượng việc đó trên một lõi, giống PHP và Python. Bảng ghi rõ "1 luồng".
# parallel — Ruby (CRuby) has a GVL: Threads do NOT run CPU work in parallel.
# It does the same total work on one core, like PHP and Python. The table labels it "1 thread".
require_relative '../_common/common'

n = lb_param('n', 256)
a = Array.new(n * n, 0)
b = Array.new(n * n, 0)
c = Array.new(n * n, 0)
n.times do |i|
  n.times do |j|
    a[i * n + j] = (i * 31 + j * 17) % 100
    b[i * n + j] = (i * 13 + j * 7) % 100
  end
end

t = Timer.new
n.times do |i|
  n.times do |k|
    aik = a[i * n + k]
    n.times do |j|
      c[i * n + j] += aik * b[k * n + j]
    end
  end
end
sum = 0
c.each { |v| sum += v }
ms = t.ms

ck = Checksum.new
ck.add_u64(sum)
lb_report(ms, ck.hex)
