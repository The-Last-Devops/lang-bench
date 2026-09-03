# Tiện ích dùng chung cho các bài test Ruby.
# Shared helpers for the Ruby benchmarks.

MASK32 = 0xFFFFFFFF

# Đồng hồ đo phần việc thật. / Clock around the real work only.
class Timer
  def initialize
    @t0 = Process.clock_gettime(Process::CLOCK_MONOTONIC)
  end

  def ms
    (Process.clock_gettime(Process::CLOCK_MONOTONIC) - @t0) * 1000.0
  end
end

# Checksum 32-bit, phải khớp với mọi ngôn ngữ khác.
# 32-bit checksum, must match every other language.
class Checksum
  def initialize
    @h = 2_166_136_261
  end

  def add(v)
    v &= MASK32
    4.times do |i|
      @h ^= (v >> (i * 8)) & 0xFF
      @h = (@h * 16_777_619) & MASK32
    end
  end

  def add_u64(v)
    add(v & MASK32)
    add((v >> 32) & MASK32)
  end

  def value
    @h
  end

  def hex
    format('%08x', @h)
  end
end

# Sinh số giả ngẫu nhiên xác định. / Deterministic PRNG.
class Lcg
  def initialize(seed = 42)
    @s = seed & MASK32
  end

  def next
    @s = (@s * 1_664_525 + 1_013_904_223) & MASK32
  end
end

# Đọc tham số key=value. / Read a key=value parameter.
def lb_param(key, fallback)
  prefix = "#{key}="
  ARGV.each do |a|
    return a[prefix.length..].to_i if a.start_with?(prefix)
  end
  fallback
end

# Dòng duy nhất mà runner đọc. / The single line the runner parses.
def lb_report(ms, checksum)
  $stdout.write(format("{\"ms\": %.3f, \"checksum\": \"%s\"}\n", ms, checksum))
end
