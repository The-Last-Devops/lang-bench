<?php
// lru-cache — cache LRU TỰ VIẾT: bảng băm cộng danh sách liên kết đôi trên mảng phẳng.
// Không dùng mảng kết hợp của PHP, dù nó vốn giữ thứ tự chèn — đó lại là so thư viện.
// Xem main.cpp để biết vì sao dùng dây xích thay cho địa chỉ mở.
// lru-cache — a hand-written LRU cache over flat arrays. PHP's ordered associative array is
// not used even though it preserves insertion order: that would compare libraries.
// See main.cpp for why this chains instead of open-addressing.
require __DIR__ . '/../_common/common.php';

$cap = lb_param('cap', 100000);
$ops = lb_param('ops', 2000000);
$space = $cap * 3;

$keys = array_fill(0, $ops, 0);
$rng = new Lcg(31);
for ($i = 0; $i < $ops; $i++) $keys[$i] = $rng->next() % $space;

$buckets = 1;
while ($buckets < $cap * 2) $buckets *= 2;
$mask = $buckets - 1;

$head = array_fill(0, $buckets, -1);
$next = array_fill(0, $cap, -1);
$key = array_fill(0, $cap, 0);
$val = array_fill(0, $cap, 0);
$prevL = array_fill(0, $cap, -1);
$nextL = array_fill(0, $cap, -1);
$lruHead = -1; $lruTail = -1; $used = 0;

$t = new Timer();

$hits = 0; $misses = 0; $sum = 0;

for ($i = 0; $i < $ops; $i++) {
    $k = $keys[$i];
    $b = (($k * 2654435761) & 0xffffffff) & $mask;

    $node = $head[$b];
    while ($node >= 0 && $key[$node] !== $k) $node = $next[$node];

    if ($node >= 0) {
        $hits++;
        $sum = ($sum + $val[$node]) & 0xffffffff;
        if ($lruHead !== $node) {
            $p = $prevL[$node]; $nx = $nextL[$node];
            if ($p >= 0) $nextL[$p] = $nx;
            if ($nx >= 0) $prevL[$nx] = $p;
            if ($lruTail === $node) $lruTail = $p;
            $prevL[$node] = -1;
            $nextL[$node] = $lruHead;
            if ($lruHead >= 0) $prevL[$lruHead] = $node;
            $lruHead = $node;
        }
        continue;
    }

    $misses++;
    if ($used < $cap) {
        $slot = $used++;
    } else {
        $slot = $lruTail;
        $ob = (($key[$slot] * 2654435761) & 0xffffffff) & $mask;
        $cur = $head[$ob]; $prev = -1;
        while ($cur >= 0 && $cur !== $slot) { $prev = $cur; $cur = $next[$cur]; }
        if ($prev >= 0) $next[$prev] = $next[$slot];
        else $head[$ob] = $next[$slot];

        $p = $prevL[$slot];
        if ($p >= 0) $nextL[$p] = -1;
        $lruTail = $p;
        if ($lruHead === $slot) $lruHead = -1;
    }

    $key[$slot] = $k;
    $val[$slot] = ($k * 2 + 1) & 0xffffffff;
    $next[$slot] = $head[$b];
    $head[$b] = $slot;

    $prevL[$slot] = -1;
    $nextL[$slot] = $lruHead;
    if ($lruHead >= 0) $prevL[$lruHead] = $slot;
    $lruHead = $slot;
    if ($lruTail < 0) $lruTail = $slot;
}

$ms = $t->ms();
$c = new Checksum();
$c->add($hits);
$c->add($misses);
$c->add($sum);
lb_report($ms, $c->hex());
