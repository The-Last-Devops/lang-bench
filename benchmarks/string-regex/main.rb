# string-regex — khớp regex trên 200k dòng log. Ruby dùng Onigmo, một engine C.
# string-regex — match a regex over 200k log lines. Ruby uses Onigmo, a C engine.
require_relative '../_common/common'

PATTERN = %r{^(\d+\.\d+\.\d+\.\d+) - \[([0-9-]+)\] "(GET|POST) (\S+) HTTP/1\.1" (\d{3}) (\d+)$}

n = lb_param('n', 200_000)

lines = Array.new(n)
rng = Lcg.new(42)
i = 0
while i < n
  a = rng.next % 256
  b = rng.next % 256
  day = rng.next % 28 + 1
  post = rng.next % 4 == 0
  status = 200
  status = rng.next % 2 == 1 ? 404 : 500 if rng.next % 10 >= 8
  nbytes = rng.next % 100_000
  lines[i] = format('10.0.%d.%d - [2026-08-%02d] "%s /path/%d HTTP/1.1" %d %d',
                    a, b, day, post ? 'POST' : 'GET', i, status, nbytes)
  i += 1
end

t = Timer.new
sum_bytes = 0
ok200 = 0
posts = 0
matched = 0
lines.each do |line|
  m = PATTERN.match(line)
  next if m.nil?

  matched += 1
  posts += 1 if m[3] == 'POST'
  ok200 += 1 if m[5].to_i == 200
  sum_bytes = (sum_bytes + m[6].to_i) & MASK32
end
ms = t.ms

c = Checksum.new
c.add(sum_bytes)
c.add(ok200)
c.add(posts)
c.add(matched)
lb_report(ms, c.hex)
