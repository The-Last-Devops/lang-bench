<?php
// string-regex — khớp regex trên 200k dòng log. PHP dùng PCRE2, một thư viện C trưởng thành.
// string-regex — match a regex over 200k log lines. PHP uses PCRE2, a mature C library.
require __DIR__ . '/../_common/common.php';

const PATTERN = '/^(\d+\.\d+\.\d+\.\d+) - \[([0-9-]+)\] "(GET|POST) (\S+) HTTP\/1\.1" (\d{3}) (\d+)$/';

$n = lb_param('n', 200000);

$lines = [];
$rng = new Lcg(42);
for ($i = 0; $i < $n; $i++) {
    $a = $rng->next() % 256;
    $b = $rng->next() % 256;
    $day = $rng->next() % 28 + 1;
    $post = $rng->next() % 4 === 0;
    $status = 200;
    if ($rng->next() % 10 >= 8) {
        $status = $rng->next() % 2 === 1 ? 404 : 500;
    }
    $bytes = $rng->next() % 100000;
    $lines[] = sprintf(
        '10.0.%d.%d - [2026-08-%02d] "%s /path/%d HTTP/1.1" %d %d',
        $a, $b, $day, $post ? 'POST' : 'GET', $i, $status, $bytes
    );
}

$t = new Timer();
$sumBytes = 0;
$ok200 = 0;
$posts = 0;
$matched = 0;
foreach ($lines as $line) {
    if (preg_match(PATTERN, $line, $m) === 1) {
        $matched++;
        if ($m[3] === 'POST') {
            $posts++;
        }
        if ((int) $m[5] === 200) {
            $ok200++;
        }
        $sumBytes = ($sumBytes + (int) $m[6]) & 0xffffffff;
    }
}
$ms = $t->ms();

$c = new Checksum();
$c->add($sumBytes);
$c->add($ok200);
$c->add($posts);
$c->add($matched);
lb_report($ms, $c->hex());
