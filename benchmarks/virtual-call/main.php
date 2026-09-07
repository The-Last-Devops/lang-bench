<?php
// virtual-call — gọi phương thức trên mảng trộn lẫn bốn lớp. Xem main.cpp để biết vì sao
// mảng phải trộn lẫn.
// virtual-call — method dispatch over an array of four mixed classes. See main.cpp for why
// the array must be mixed.
require __DIR__ . '/../_common/common.php';

interface Shape { public function area(): int; }

final class Square implements Shape {
    public function __construct(private int $a) {}
    public function area(): int { return ($this->a * $this->a) & 0xffffffff; }
}
final class Rect implements Shape {
    public function __construct(private int $a, private int $b) {}
    public function area(): int { return ($this->a * $this->b) & 0xffffffff; }
}
final class Tri implements Shape {
    public function __construct(private int $a, private int $b) {}
    public function area(): int { return intdiv(($this->a * $this->b) & 0xffffffff, 2); }
}
final class Line implements Shape {
    public function __construct(private int $a) {}
    public function area(): int { return $this->a; }
}

$n = lb_param('n', 1000000);
$passes = lb_param('passes', 20);

$rng = new Lcg(5);
$v = [];
for ($i = 0; $i < $n; $i++) {
    $kind = $rng->next() % 4;
    $a = $rng->next() % 1000;
    $b = $rng->next() % 1000;
    $v[$i] = match ($kind) {
        0 => new Square($a),
        1 => new Rect($a, $b),
        2 => new Tri($a, $b),
        default => new Line($a),
    };
}

$t = new Timer();
$sum = 0;
for ($p = 0; $p < $passes; $p++) {
    foreach ($v as $s) {
        $sum = ($sum + $s->area()) & 0xffffffff;
    }
}
$ms = $t->ms();

$c = new Checksum();
$c->add($sum);
$c->add($passes);
lb_report($ms, $c->hex());
