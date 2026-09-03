<?php
// fib — đệ quy thuần, đo chi phí gọi hàm và stack.
// fib — plain recursion, measuring call and stack cost.
require __DIR__ . '/../_common/common.php';

function fib(int $n): int
{
    return $n < 2 ? $n : fib($n - 1) + fib($n - 2);
}

$n = lb_param('n', 32);
$t = new Timer();
$v = fib($n);
$ms = $t->ms();
$c = new Checksum();
$c->add($v & 0xffffffff);
lb_report($ms, $c->hex());
