<?php
// binary-trees — dựng rồi huỷ hàng loạt cây nhỏ, ngắn hạn. Đo bộ cấp phát và bộ thu hồi.
// binary-trees — building and discarding many small, short-lived trees: allocator and
// reclamation pressure.
require __DIR__ . '/../_common/common.php';

// Cây bằng mảng hai phần tử [trái, phải]; lá là [null, null]. Object của PHP nặng hơn mảng
// đáng kể, mà bài này đo chi phí cấp phát nên dùng cấu trúc nhẹ nhất mà PHP có.
// Trees are two-element arrays [left, right]; a leaf is [null, null]. A PHP object costs
// noticeably more than an array, and since this measures allocation the lightest structure
// PHP offers is the honest choice.
function build(int $depth): array
{
    if ($depth > 0) {
        return [build($depth - 1), build($depth - 1)];
    }
    return [null, null];
}

function check(array $n): int
{
    if ($n[0] === null) {
        return 1;
    }
    return 1 + check($n[0]) + check($n[1]);
}

$maxDepth = lb_param('depth', 16);
$t = new Timer();

$total = 0;
for ($d = 4; $d <= $maxDepth; $d += 2) {
    $iters = 1 << ($maxDepth - $d + 4);
    for ($i = 0; $i < $iters; $i++) {
        $total += check(build($d));
    }
}

$ms = $t->ms();
$c = new Checksum();
$c->addU64($total);
lb_report($ms, $c->hex());
