# primes — sàng Eratosthenes. Dùng String làm mảng byte qua setbyte/getbyte:
# Array.new(10_000_000) sẽ ngốn hàng trăm MB.
# primes — sieve of Eratosthenes. Uses a String as a byte array via setbyte/getbyte:
# Array.new(10_000_000) would eat hundreds of megabytes.
require_relative '../_common/common'

n = lb_param('n', 10_000_000)
t = Timer.new
composite = ("\0" * (n + 1)).b
i = 2
while i * i <= n
  if composite.getbyte(i) == 0
    j = i * i
    while j <= n
      composite.setbyte(j, 1)
      j += i
    end
  end
  i += 1
end

count = 0
sum = 0
i = 2
while i <= n
  if composite.getbyte(i) == 0
    count += 1
    sum = (sum + i) & MASK32
  end
  i += 1
end
ms = t.ms

c = Checksum.new
c.add(count)
c.add(sum)
lb_report(ms, c.hex)
