# matmul — nhân ma trận N×N kiểu ngây thơ, Ruby thuần.
# matmul — naive N×N matrix multiply in plain Ruby.
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
