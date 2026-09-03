<?php
// sort — sắp xếp mảng số nguyên 32-bit bằng sort() của PHP.
// sort — sort an array of 32-bit integers with PHP's sort().
require __DIR__ . '/../_common/common.php';

$n = lb_param('n', 3000000);
$v = array_fill(0, $n, 0);
$rng = new Lcg(42);
for ($i = 0; $i < $n; $i++) {
    $v[$i] = $rng->next();
}

$t = new Timer();
sort($v, SORT_NUMERIC);
$ms = $t->ms();

$sum = 0;
for ($i = 0; $i < $n; $i += 1000) {
    $sum = ($sum + $v[$i]) & 0xffffffff;
}
$c = new Checksum();
$c->add($v[0]);
$c->add($v[$n - 1]);
$c->add($sum);
lb_report($ms, $c->hex());
