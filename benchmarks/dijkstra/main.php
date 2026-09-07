<?php
// dijkstra — đường đi ngắn nhất trên đồ thị thưa, heap nhị phân TỰ VIẾT.
// Xem main.cpp để biết vì sao không dùng SplPriorityQueue.
// dijkstra — shortest paths over a sparse graph with a hand-written binary heap.
// See main.cpp for why SplPriorityQueue is not used.
require __DIR__ . '/../_common/common.php';

$n = lb_param('n', 200000);
$deg = lb_param('deg', 8);

// Đồ thị dạng CSR, sinh bằng cùng một LCG nên bốn ngôn ngữ nhận đúng cùng đồ thị.
// Phần dựng nằm ngoài đồng hồ — bài này đo tìm đường.
// A CSR graph from the same LCG, so every language sees the same graph. Construction sits
// outside the clock: this benchmark measures the search.
$head = array_fill(0, $n + 1, 0);
$to = array_fill(0, $n * $deg, 0);
$w = array_fill(0, $n * $deg, 0);
$rng = new Lcg(12345);
for ($i = 0; $i <= $n; $i++) $head[$i] = $i * $deg;
$m = $n * $deg;
for ($i = 0; $i < $m; $i++) {
    $to[$i] = $rng->next() % $n;
    $w[$i] = 1 + $rng->next() % 1000;
}

$t = new Timer();

$INF = PHP_INT_MAX;
$dist = array_fill(0, $n, $INF);

// Heap nhị phân trên hai mảng phẳng, lười xoá: một đỉnh có thể vào heap nhiều lần, lần lấy
// ra đầu tiên đã là ngắn nhất.
// A binary heap over two flat arrays with lazy deletion: a node may be pushed several times
// and the first pop is already the shortest.
$hd = [];
$hv = [];
$hn = 0;

$dist[0] = 0;
$hd[0] = 0; $hv[0] = 0; $hn = 1;

while ($hn > 0) {
    $d = $hd[0];
    $u = $hv[0];

    // pop
    $last = --$hn;
    $hd[0] = $hd[$last];
    $hv[0] = $hv[$last];
    $i = 0;
    while (true) {
        $l = $i * 2 + 1;
        $r = $l + 1;
        $best = $i;
        if ($l < $hn && $hd[$l] < $hd[$best]) $best = $l;
        if ($r < $hn && $hd[$r] < $hd[$best]) $best = $r;
        if ($best === $i) break;
        $td = $hd[$best]; $hd[$best] = $hd[$i]; $hd[$i] = $td;
        $tv = $hv[$best]; $hv[$best] = $hv[$i]; $hv[$i] = $tv;
        $i = $best;
    }

    if ($d > $dist[$u]) continue;   // bản cũ đã lỗi thời / a stale copy

    for ($e = $head[$u]; $e < $head[$u + 1]; $e++) {
        $nd = $d + $w[$e];
        $v = $to[$e];
        if ($nd < $dist[$v]) {
            $dist[$v] = $nd;
            // push
            $hd[$hn] = $nd; $hv[$hn] = $v;
            $i = $hn++;
            while ($i > 0) {
                $p = intdiv($i - 1, 2);
                if ($hd[$p] <= $hd[$i]) break;
                $td = $hd[$p]; $hd[$p] = $hd[$i]; $hd[$i] = $td;
                $tv = $hv[$p]; $hv[$p] = $hv[$i]; $hv[$i] = $tv;
                $i = $p;
            }
        }
    }
}

$sum = 0;
$reach = 0;
for ($i = 0; $i < $n; $i++) {
    if ($dist[$i] !== $INF) { $sum += $dist[$i]; $reach++; }
}

$ms = $t->ms();
$c = new Checksum();
$c->addU64($sum);
$c->addU64($reach);
lb_report($ms, $c->hex());
