# fib — đệ quy thuần, đo chi phí gọi hàm và stack.
# fib — plain recursion, measuring call and stack cost.
require_relative '../_common/common'

def fib(n)
  n < 2 ? n : fib(n - 1) + fib(n - 2)
end

n = lb_param('n', 32)
t = Timer.new
v = fib(n)
ms = t.ms
c = Checksum.new
c.add(v & MASK32)
lb_report(ms, c.hex)
