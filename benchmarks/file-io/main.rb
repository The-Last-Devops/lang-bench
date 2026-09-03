# file-io — ghi tuần tự rồi đọc lại 256 MB. Đo I/O đĩa, không đo CPU.
# file-io — write then read back 256 MB sequentially. This measures disk I/O, not CPU.
require_relative '../_common/common'

mb = lb_param('mb', 256)
chunk = 1 << 20
sample = 4096
dir = ENV['LB_TMPDIR']
dir = '/tmp' if dir.nil? || dir.empty?
path = File.join(dir, 'lang-bench-io-ruby.bin')

# Buffer dựng MỘT LẦN, trước đồng hồ. / Buffer built ONCE, before the clock.
buf = ("\0" * chunk).b
j = 0
while j < chunk
  buf.setbyte(j, (j * 31 + 7) & 0xff)
  j += 1
end

t = Timer.new
File.open(path, 'wb') do |f|
  mb.times { f.write(buf) }
  f.flush
  f.fsync
end

# Chỉ cộng 4 KB đầu mỗi chunk để xác minh — xem ghi chú ở main.cpp.
# Verify by summing only the first 4 KB of each chunk — see the note in main.cpp.
sum = 0
total_read = 0
File.open(path, 'rb') do |f|
  mb.times do
    data = f.read(chunk)
    break if data.nil?

    total_read += data.bytesize
    lim = [data.bytesize, sample].min
    j = 0
    while j < lim
      sum = (sum + data.getbyte(j)) & MASK32
      j += 1
    end
  end
end
ms = t.ms
File.delete(path)

c = Checksum.new
c.add(sum)
c.add(total_read >> 20)
c.add(mb)
lb_report(ms, c.hex)
