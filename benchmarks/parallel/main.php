<?php
// parallel — PHP CLI mặc định KHÔNG có luồng. Nó làm đúng lượng việc đó trên một lõi.
// Đây không phải lỗi đo: đó chính là hiện thực, và bảng kết quả ghi rõ "1 luồng".
// parallel — PHP CLI has NO threads by default. It does the same total work on one core.
// This is not a measurement flaw: it is the reality, and the results table labels it "1 thread".
require __DIR__ . '/../_common/common.php';

$n = lb_param('n', 256);

$a = array_fill(0, $n * $n, 0.0);
$b = array_fill(0, $n * $n, 0.0);
$c = array_fill(0, $n * $n, 0.0);
for ($i = 0; $i < $n; $i++) {
    for ($j = 0; $j < $n; $j++) {
        $a[$i * $n + $j] = (float) (($i * 31 + $j * 17) % 100);
        $b[$i * $n + $j] = (float) (($i * 13 + $j * 7) % 100);
    }
}

$t = new Timer();
for ($i = 0; $i < $n; $i++) {
    for ($k = 0; $k < $n; $k++) {
        $aik = $a[$i * $n + $k];
        for ($j = 0; $j < $n; $j++) {
            $c[$i * $n + $j] += $aik * $b[$k * $n + $j];
        }
    }
}
$sum = 0.0;
foreach ($c as $v) {
    $sum += $v;
}
$ms = $t->ms();

$ck = new Checksum();
$ck->add((int) fmod($sum, 4294967296.0));
lb_report($ms, $ck->hex());
