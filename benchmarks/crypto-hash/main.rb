# crypto-hash — SHA-256 trên 200 MB. Digest của Ruby gọi vào OpenSSL.
# crypto-hash — SHA-256 over 200 MB. Ruby's Digest calls into OpenSSL.
require 'digest'
require_relative '../_common/common'

iters = lb_param('iters', 200)
chunk = 1 << 20

buf = ("\0" * chunk).b
j = 0
while j < chunk
  buf.setbyte(j, (j * 31 + 7) & 0xff)
  j += 1
end

t = Timer.new
h = Digest::SHA256.new
iters.times { h.update(buf) }
digest = h.digest
ms = t.ms

head = (digest.getbyte(0) << 24) | (digest.getbyte(1) << 16) | (digest.getbyte(2) << 8) | digest.getbyte(3)
c = Checksum.new
c.add(head)
c.add(iters)
lb_report(ms, c.hex)
