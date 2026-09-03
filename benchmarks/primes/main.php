<?php
// primes — sàng Eratosthenes, đo vòng lặp chặt và truy cập mảng lớn.
// primes — sieve of Eratosthenes, measuring tight loops over a large array.
// PHP dùng chuỗi làm mảng byte: array_fill 10 triệu phần tử sẽ ngốn hàng GB.
// PHP uses a string as its byte array: a 10-million-element array_fill would eat gigabytes.
require __DIR__ . '/../_common/common.php';

$n = lb_param('n', 10000000);
$t = new Timer();
$composite = str_repeat("\0", $n + 1);
for ($i = 2; $i * $i <= $n; $i++) {
    if ($composite[$i] === "\0") {
        for ($j = $i * $i; $j <= $n; $j += $i) {
            $composite[$j] = "\1";
        }
    }
}

$count = 0;
$sum = 0;
for ($i = 2; $i <= $n; $i++) {
    if ($composite[$i] === "\0") {
        $count++;
        $sum = ($sum + $i) & 0xffffffff;
    }
}
$ms = $t->ms();

$c = new Checksum();
$c->add($count);
$c->add($sum);
lb_report($ms, $c->hex());
