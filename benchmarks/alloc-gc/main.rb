# alloc-gc — cấp rồi thả hàng triệu object nhỏ, để GC của Ruby tự dọn.
# alloc-gc — allocate and drop millions of small objects, letting Ruby's GC clean up.
require_relative '../_common/common'

class Node
  attr_accessor :value, :next_node

  def initialize(value, next_node)
    @value = value
    @next_node = next_node
  end
end

batches = lb_param('batches', 400)
per = lb_param('per', 5000)
rng = Lcg.new(42)

t = Timer.new
total = 0
batches.times do
  head = nil
  per.times { head = Node.new(rng.next, head) }
  p = head
  while p
    total = (total + p.value) & MASK32
    p = p.next_node
  end
  head = nil # thả tham chiếu / drop the reference
end
ms = t.ms

c = Checksum.new
c.add(total)
c.add((batches * per) & MASK32)
lb_report(ms, c.hex)
