# json — dựng 100k record, serialize, parse lại, đọc số liệu.
# Thư viện json của Ruby có phần tăng tốc viết bằng C.
# json — build 100k records, serialize, parse back, read fields.
# Ruby's json library has a C extension underneath.
require 'json'
require_relative '../_common/common'

n = lb_param('n', 100_000)

t = Timer.new
docs = Array.new(n)
i = 0
while i < n
  docs[i] = { 'id' => i, 'name' => "user#{i}", 'score' => (i * 37) % 1000, 'active' => i % 3 == 0 }
  i += 1
end
text = JSON.generate(docs)
back = JSON.parse(text)

sum_id = 0
sum_score = 0
active = 0
back.each do |rec|
  sum_id = (sum_id + rec['id']) & MASK32
  sum_score = (sum_score + rec['score']) & MASK32
  active += 1 if rec['active']
end
ms = t.ms

c = Checksum.new
c.add(sum_id)
c.add(sum_score)
c.add(active)
c.add(text.bytesize)
lb_report(ms, c.hex)
