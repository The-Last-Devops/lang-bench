<?php
// string-build — nối chuỗi và tự chuyển số sang thập phân. Xem main.cpp để biết vì sao
// không dùng hàm định dạng của thư viện.
// string-build — appending and hand-rolled integer-to-decimal. See main.cpp for why the
// library's formatting is not used.
require __DIR__ . '/../_common/common.php';

$n = lb_param('n', 400000);
$t = new Timer();

$s = '';
for ($i = 0; $i < $n; $i++) {
    $v = $i % 1000;
    $d = '';
    do { $d = chr(48 + $v % 10) . $d; $v = intdiv($v, 10); } while ($v);
    $s .= $d . ',';
}

// Cộng có trọng số theo vị trí: đổi chỗ hai ký tự là checksum đổi.
// A position-weighted sum: swapping two characters changes it.
$sum = 0;
$len = strlen($s);
for ($i = 0; $i < $len; $i++) {
    $sum = ($sum + ($i + 1) * ord($s[$i])) & 0xffffffff;
}

$ms = $t->ms();
$c = new Checksum();
$c->add($sum);
$c->addU64($len);
lb_report($ms, $c->hex());
