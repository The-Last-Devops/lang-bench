<?php
// json — dựng 100k record, serialize ra chuỗi, parse lại, đọc số liệu.
// json_encode / json_decode là code C bên trong PHP, không phải PHP.
// json — build 100k records, serialize to a string, parse it back, read the fields.
// json_encode / json_decode are C code inside PHP, not PHP.
require __DIR__ . '/../_common/common.php';

$n = lb_param('n', 100000);

$t = new Timer();
$docs = [];
for ($i = 0; $i < $n; $i++) {
    $docs[] = [
        'id' => $i,
        'name' => 'user' . $i,
        'score' => ($i * 37) % 1000,
        'active' => $i % 3 === 0,
    ];
}
$text = json_encode($docs);
$back = json_decode($text, true);

$sumId = 0;
$sumScore = 0;
$active = 0;
foreach ($back as $rec) {
    $sumId = ($sumId + $rec['id']) & 0xffffffff;
    $sumScore = ($sumScore + $rec['score']) & 0xffffffff;
    if ($rec['active']) {
        $active++;
    }
}
$ms = $t->ms();

$c = new Checksum();
$c->add($sumId);
$c->add($sumScore);
$c->add($active);
$c->add(strlen($text));
lb_report($ms, $c->hex());
