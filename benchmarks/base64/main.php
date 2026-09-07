<?php
// base64 — mã hoá rồi giải mã, tự viết bằng dịch bit và tra bảng. Không dùng base64_encode:
// bốn ngôn ngữ phải chạy đúng cùng một đoạn mã thì so sánh mới có nghĩa.
// base64 — hand-written encode and decode over byte arrays. base64_encode is deliberately
// unused: the comparison only means something if every language runs the same code.
require __DIR__ . '/../_common/common.php';

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

$size = lb_param('size', 3000000);

$src = array_fill(0, $size, 0);
$rng = new Lcg(7);
for ($i = 0; $i < $size; $i++) $src[$i] = ($rng->next() >> 24) & 0xff;

$rev = array_fill(0, 256, -1);
for ($i = 0; $i < 64; $i++) $rev[ord(ALPHA[$i])] = $i;
$alpha = [];
for ($i = 0; $i < 64; $i++) $alpha[$i] = ord(ALPHA[$i]);

$t = new Timer();

$encLen = intdiv($size + 2, 3) * 4;
$enc = array_fill(0, $encLen, 0);
$o = 0;
for ($i = 0; $i < $size; $i += 3) {
    $v = $src[$i] << 16;
    if ($i + 1 < $size) $v |= $src[$i + 1] << 8;
    if ($i + 2 < $size) $v |= $src[$i + 2];
    $enc[$o++] = $alpha[($v >> 18) & 63];
    $enc[$o++] = $alpha[($v >> 12) & 63];
    $enc[$o++] = $i + 1 < $size ? $alpha[($v >> 6) & 63] : 61;
    $enc[$o++] = $i + 2 < $size ? $alpha[$v & 63] : 61;
}

$dec = array_fill(0, $size, 0);
$d = 0;
for ($i = 0; $i < $encLen; $i += 4) {
    $c0 = $rev[$enc[$i]];
    $c1 = $rev[$enc[$i + 1]];
    $c2 = $enc[$i + 2] === 61 ? -1 : $rev[$enc[$i + 2]];
    $c3 = $enc[$i + 3] === 61 ? -1 : $rev[$enc[$i + 3]];
    $v = ($c0 << 18) | ($c1 << 12);
    if ($c2 >= 0) $v |= $c2 << 6;
    if ($c3 >= 0) $v |= $c3;
    if ($d < $size) $dec[$d++] = ($v >> 16) & 0xff;
    if ($c2 >= 0 && $d < $size) $dec[$d++] = ($v >> 8) & 0xff;
    if ($c3 >= 0 && $d < $size) $dec[$d++] = $v & 0xff;
}

$encSum = 0;
$decSum = 0;
for ($i = 0; $i < $encLen; $i++) $encSum = ($encSum + ($i + 1) * $enc[$i]) & 0xffffffff;
for ($i = 0; $i < $d; $i++) $decSum = ($decSum + ($i + 1) * $dec[$i]) & 0xffffffff;

$ms = $t->ms();
$c = new Checksum();
$c->add($encSum);
$c->add($decSum);
$c->addU64($encLen);
lb_report($ms, $c->hex());
