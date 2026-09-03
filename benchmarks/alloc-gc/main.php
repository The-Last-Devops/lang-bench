<?php
// alloc-gc — cấp rồi thả hàng triệu object nhỏ. PHP đếm tham chiếu, thu hồi ngay.
// alloc-gc — allocate and drop millions of small objects. PHP refcounts and frees immediately.
require __DIR__ . '/../_common/common.php';

final class Node
{
    public function __construct(public int $value, public ?Node $next) {}
}

$batches = lb_param('batches', 400);
$per = lb_param('per', 5000);
$rng = new Lcg(42);

$t = new Timer();
$total = 0;
for ($b = 0; $b < $batches; $b++) {
    $head = null;
    for ($i = 0; $i < $per; $i++) {
        $head = new Node($rng->next(), $head);
    }
    for ($p = $head; $p !== null; $p = $p->next) {
        $total = ($total + $p->value) & 0xffffffff;
    }
    $head = null; // thả tham chiếu / drop the reference
}
$ms = $t->ms();

$c = new Checksum();
$c->add($total);
$c->add(($batches * $per) & 0xffffffff);
lb_report($ms, $c->hex());
