<?php
// file-io — ghi tuần tự rồi đọc lại 256 MB. Đo I/O đĩa, không đo CPU.
// file-io — write then read back 256 MB sequentially. This measures disk I/O, not CPU.
require __DIR__ . '/../_common/common.php';

$mb = lb_param('mb', 256);
$chunk = 1 << 20;
$dir = getenv('LB_TMPDIR') ?: '/tmp';
$file = $dir . '/lang-bench-io-php.bin';

// Buffer dựng MỘT LẦN, trước đồng hồ. / Buffer built ONCE, before the clock.
$buf = str_repeat("\0", $chunk);
for ($j = 0; $j < $chunk; $j++) {
    $buf[$j] = chr(($j * 31 + 7) & 0xff);
}

$t = new Timer();
$fh = fopen($file, 'wb');
for ($k = 0; $k < $mb; $k++) {
    fwrite($fh, $buf);
}
fflush($fh);
fsync($fh);
fclose($fh);

// Chỉ cộng 4 KB đầu mỗi chunk để xác minh — xem ghi chú ở main.cpp.
// Verify by summing only the first 4 KB of each chunk — see the note in main.cpp.
const SAMPLE = 4096;
$sum = 0;
$totalRead = 0;
$fh = fopen($file, 'rb');
for ($k = 0; $k < $mb; $k++) {
    $data = fread($fh, $chunk);
    $len = strlen($data);
    $totalRead += $len;
    $lim = min($len, SAMPLE);
    for ($j = 0; $j < $lim; $j++) {
        $sum = ($sum + ord($data[$j])) & 0xffffffff;
    }
}
fclose($fh);
$ms = $t->ms();
unlink($file);

$c = new Checksum();
$c->add($sum);
$c->add(intdiv($totalRead, 1048576));
$c->add($mb);
lb_report($ms, $c->hex());
