<?php
// Tiện ích dùng chung cho các bài test PHP / Shared helpers for the PHP benchmarks.

/** Đồng hồ đo phần việc thật. / Clock around the real work only. */
final class Timer
{
    private float $t0;

    public function __construct() { $this->t0 = hrtime(true) / 1e6; }

    public function ms(): float { return hrtime(true) / 1e6 - $this->t0; }
}

/**
 * Checksum 32-bit, phải khớp với cả 4 ngôn ngữ kia.
 * 32-bit checksum, must match the other four languages.
 */
final class Checksum
{
    private int $h = 2166136261;

    public function add(int $v): void
    {
        $v &= 0xffffffff;
        for ($i = 0; $i < 4; $i++) {
            $this->h ^= ($v >> ($i * 8)) & 0xff;
            $this->h = ($this->h * 16777619) & 0xffffffff;
        }
    }

    public function addU64(int $v): void
    {
        $this->add($v & 0xffffffff);
        $this->add(($v >> 32) & 0xffffffff);
    }

    public function value(): int { return $this->h; }

    public function hex(): string { return sprintf('%08x', $this->h); }
}

/** Sinh số giả ngẫu nhiên xác định. / Deterministic PRNG. */
final class Lcg
{
    private int $s;

    public function __construct(int $seed = 42) { $this->s = $seed & 0xffffffff; }

    public function next(): int
    {
        $this->s = ($this->s * 1664525 + 1013904223) & 0xffffffff;
        return $this->s;
    }
}

/** Đọc tham số key=value. / Read a key=value parameter. */
function lb_param(string $key, int $fallback): int
{
    global $argv;
    $prefix = $key . '=';
    foreach (array_slice($argv, 1) as $a) {
        if (str_starts_with($a, $prefix)) {
            return (int) substr($a, strlen($prefix));
        }
    }
    return $fallback;
}

/** Dòng duy nhất mà runner đọc. / The single line the runner parses. */
function lb_report(float $ms, string $checksum): void
{
    printf("{\"ms\": %.3f, \"checksum\": \"%s\"}\n", $ms, $checksum);
}
