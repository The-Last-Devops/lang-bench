<?php
// utf8 — dựng chuỗi nhiều ngôn ngữ rồi duyệt từng điểm mã, tự giải mã UTF-8.
// PHP không có kiểu chuỗi Unicode: chuỗi PHP là byte, nên phải giải mã bằng tay đúng như C++.
// utf8 — build a multilingual string, then walk it code point by code point, decoding by hand.
// PHP has no Unicode string type: a PHP string is bytes, so it decodes by hand exactly as C++ does.
require __DIR__ . '/../_common/common.php';

$n = lb_param('n', 6000000);

// Bốn dải: ASCII 1 byte, Latin 2 byte, CJK 3 byte, ký hiệu 4 byte.
// Four ranges: ASCII at 1 byte, Latin at 2, CJK at 3, symbols at 4.
$rng = new Lcg(2024);
$parts = [];
$chunk = '';
for ($i = 0; $i < $n; $i++) {
    $r = $rng->next();
    switch ($r & 3) {
        case 0: $cp = 0x20 + (($r >> 8) % 95); break;
        case 1: $cp = 0xC0 + (($r >> 8) % 64); break;
        case 2: $cp = 0x4E00 + (($r >> 8) % 0x5000); break;
        default: $cp = 0x1F300 + (($r >> 8) % 0x300); break;
    }
    if ($cp < 0x80) {
        $chunk .= chr($cp);
    } elseif ($cp < 0x800) {
        $chunk .= chr(0xC0 | ($cp >> 6)) . chr(0x80 | ($cp & 0x3F));
    } elseif ($cp < 0x10000) {
        $chunk .= chr(0xE0 | ($cp >> 12)) . chr(0x80 | (($cp >> 6) & 0x3F)) . chr(0x80 | ($cp & 0x3F));
    } else {
        $chunk .= chr(0xF0 | ($cp >> 18)) . chr(0x80 | (($cp >> 12) & 0x3F))
                . chr(0x80 | (($cp >> 6) & 0x3F)) . chr(0x80 | ($cp & 0x3F));
    }
    // Gom theo cụm rồi nối một lần: nối vào một chuỗi dài 6 triệu lần sẽ đo nhầm sang
    // phần dựng chuỗi thay vì phần duyệt.
    // Collected in chunks and joined once: six million appends to one long string would
    // measure string building instead of the walk.
    if (($i & 0xFFFF) === 0xFFFF) { $parts[] = $chunk; $chunk = ''; }
}
$parts[] = $chunk;
$s = implode('', $parts);
$len = strlen($s);

$t = new Timer();

$sum = 0; $wide = 0; $idx = 0;
$i = 0;
while ($i < $len) {
    $b0 = ord($s[$i]);
    if ($b0 < 0x80) {
        $cp = $b0; $i += 1;
    } elseif (($b0 & 0xE0) === 0xC0) {
        $cp = (($b0 & 0x1F) << 6) | (ord($s[$i + 1]) & 0x3F); $i += 2;
    } elseif (($b0 & 0xF0) === 0xE0) {
        $cp = (($b0 & 0x0F) << 12) | ((ord($s[$i + 1]) & 0x3F) << 6) | (ord($s[$i + 2]) & 0x3F);
        $i += 3;
    } else {
        $cp = (($b0 & 0x07) << 18) | ((ord($s[$i + 1]) & 0x3F) << 12)
            | ((ord($s[$i + 2]) & 0x3F) << 6) | (ord($s[$i + 3]) & 0x3F);
        $i += 4;
    }
    $idx++;
    $sum = ($sum + $idx * $cp) & 0xffffffff;
    if ($cp > 0x7F) $wide++;
}

$ms = $t->ms();
$c = new Checksum();
$c->add($sum);
$c->add($wide);
$c->add($idx);
$c->addU64($len);
lb_report($ms, $c->hex());
