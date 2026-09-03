<?php
// hashmap — chèn và tra cứu khóa chuỗi, đo mảng kết hợp của PHP.
// hashmap — insert and look up string keys, measuring PHP's associative array.
require __DIR__ . '/../_common/common.php';

$n = lb_param('n', 1000000);
$t = new Timer();
$m = [];
for ($i = 0; $i < $n; $i++) {
    $m['key' . $i] = ($i * 7) & 0xffffffff;
}

$sum = 0;
$hits = 0;
$misses = 0;
for ($i = 0; $i < $n; $i++) {
    $k = 'key' . $i;
    if (isset($m[$k])) {
        $hits++;
        $sum = ($sum + $m[$k]) & 0xffffffff;
    }
}
for ($i = 0; $i < intdiv($n, 2); $i++) {
    if (!isset($m['nokey' . $i])) {
        $misses++;
    }
}
$ms = $t->ms();

$c = new Checksum();
$c->add($sum);
$c->add($hits);
$c->add($misses);
lb_report($ms, $c->hex());
