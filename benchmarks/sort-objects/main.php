<?php
// sort-objects — merge sort đáy-lên TỰ VIẾT trên mảng bản ghi, so theo khoá (key, id).
// Xem main.cpp để biết vì sao không dùng usort.
// sort-objects — a hand-written bottom-up merge sort over records, keyed on (key, id).
// See main.cpp for why usort is not used.
require __DIR__ . '/../_common/common.php';

$n = lb_param('n', 400000);

// Hai mảng phẳng song song thay vì mảng bản ghi: PHP không có struct, và mảng kết hợp cho
// mỗi bản ghi sẽ biến bài này thành phép đo bảng băm.
// Two parallel flat arrays instead of records: PHP has no struct, and an associative array
// per record would turn this into a hash-table benchmark.
$key = array_fill(0, $n, 0);
$id = array_fill(0, $n, 0);
$rng = new Lcg(99);
for ($i = 0; $i < $n; $i++) { $key[$i] = $rng->next(); $id[$i] = $i; }

$bk = array_fill(0, $n, 0);
$bi = array_fill(0, $n, 0);

$t = new Timer();

for ($width = 1; $width < $n; $width *= 2) {
    for ($lo = 0; $lo < $n; $lo += $width * 2) {
        $mid = min($lo + $width, $n);
        $hi = min($lo + $width * 2, $n);
        $i = $lo; $j = $mid; $k = $lo;
        while ($i < $mid && $j < $hi) {
            $takeJ = $key[$j] !== $key[$i] ? $key[$j] < $key[$i] : $id[$j] < $id[$i];
            if ($takeJ) { $bk[$k] = $key[$j]; $bi[$k] = $id[$j]; $j++; }
            else        { $bk[$k] = $key[$i]; $bi[$k] = $id[$i]; $i++; }
            $k++;
        }
        while ($i < $mid) { $bk[$k] = $key[$i]; $bi[$k] = $id[$i]; $i++; $k++; }
        while ($j < $hi)  { $bk[$k] = $key[$j]; $bi[$k] = $id[$j]; $j++; $k++; }
    }
    // Đổi vai hai cặp mảng sau mỗi vòng, không chép ngược lại.
    // The two pairs swap roles after each pass; nothing is copied back.
    $tmp = $key; $key = $bk; $bk = $tmp;
    $tmp = $id;  $id = $bi;  $bi = $tmp;
}

$sum = 0;
for ($i = 0; $i < $n; $i++) {
    $sum = ($sum + (($i + 1) * ($key[$i] ^ $id[$i])) & 0xffffffff) & 0xffffffff;
}
$ms = $t->ms();

$c = new Checksum();
$c->add($sum);
$c->add($key[0]);
$c->add($key[$n - 1]);
lb_report($ms, $c->hex());
