<?php
// crypto-hash — SHA-256 trên 200 MB. hash_*() của PHP là code C, thường là OpenSSL.
// crypto-hash — SHA-256 over 200 MB. PHP's hash_*() are C code, usually OpenSSL.
require __DIR__ . '/../_common/common.php';

$iters = lb_param('iters', 200);
$chunk = 1 << 20;

$buf = str_repeat("\0", $chunk);
for ($i = 0; $i < $chunk; $i++) {
    $buf[$i] = chr(($i * 31 + 7) & 0xff);
}

$t = new Timer();
$ctx = hash_init('sha256');
for ($k = 0; $k < $iters; $k++) {
    hash_update($ctx, $buf);
}
$digest = hash_final($ctx, true);
$ms = $t->ms();

$head = (ord($digest[0]) << 24) | (ord($digest[1]) << 16) | (ord($digest[2]) << 8) | ord($digest[3]);
$c = new Checksum();
$c->add($head & 0xffffffff);
$c->add($iters);
lb_report($ms, $c->hex());
