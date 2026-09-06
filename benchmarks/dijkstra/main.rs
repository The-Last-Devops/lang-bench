// dijkstra — đường đi ngắn nhất trên đồ thị thưa sinh sẵn, dùng heap nhị phân tự viết.
// Đo truy cập bộ nhớ rải rác cộng với một cấu trúc dữ liệu có nhánh rẽ khó đoán.
// dijkstra — shortest paths over a generated sparse graph using a hand-written binary
// heap. This measures scattered memory access plus a data structure whose branches
// the CPU cannot predict.
#[path = "../_common/common.rs"]
mod common;
use common::*;

const INF: u64 = u64::MAX;

// Heap viết tay chứ không dùng BinaryHeap của thư viện chuẩn: mọi ngôn ngữ phải chạy
// đúng cùng một thuật toán thì so sánh mới có nghĩa.
// A hand-written heap rather than the standard library's BinaryHeap: the comparison
// only means something if every language runs the same algorithm.
struct Heap {
    d: Vec<u64>,
    v: Vec<i32>,
}

impl Heap {
    fn push(&mut self, d: u64, v: i32) {
        self.d.push(d);
        self.v.push(v);
        let mut i = self.d.len() - 1;
        while i > 0 {
            let p = (i - 1) / 2;
            if self.d[p] <= self.d[i] {
                break;
            }
            self.d.swap(p, i);
            self.v.swap(p, i);
            i = p;
        }
    }

    fn pop(&mut self) {
        let last = self.d.len() - 1;
        self.d.swap(0, last);
        self.v.swap(0, last);
        self.d.pop();
        self.v.pop();
        let (mut i, sz) = (0usize, self.d.len());
        loop {
            let (l, r) = (i * 2 + 1, i * 2 + 2);
            let mut m = i;
            if l < sz && self.d[l] < self.d[m] {
                m = l;
            }
            if r < sz && self.d[r] < self.d[m] {
                m = r;
            }
            if m == i {
                break;
            }
            self.d.swap(m, i);
            self.v.swap(m, i);
            i = m;
        }
    }
}

fn main() {
    let n = param("n", 200000) as usize;
    let deg = param("deg", 8) as usize;

    // Đồ thị dựng ở dạng CSR bằng cùng một LCG ở cả bốn ngôn ngữ. Phần dựng nằm ngoài
    // đồng hồ — bài này đo tìm đường, không đo sinh dữ liệu.
    // CSR graph built from the same LCG in all four languages. Construction sits outside
    // the clock: this benchmark measures the search, not the data generation.
    let mut head = vec![0i32; n + 1];
    let mut to = vec![0i32; n * deg];
    let mut w = vec![0u32; n * deg];
    let mut rng = Lcg::new(12345);
    for i in 0..=n {
        head[i] = (i * deg) as i32;
    }
    for i in 0..to.len() {
        to[i] = (rng.next() % n as u32) as i32;
        w[i] = 1 + rng.next() % 1000;
    }

    let t = Timer::new();

    let mut dist = vec![INF; n];
    let mut h = Heap {
        d: Vec::with_capacity(1 << 16),
        v: Vec::with_capacity(1 << 16),
    };

    dist[0] = 0;
    h.push(0, 0);
    while !h.d.is_empty() {
        let d = h.d[0];
        let u = h.v[0] as usize;
        h.pop();
        if d > dist[u] {
            continue; // bản cũ đã lỗi thời / a stale copy
        }
        for e in head[u]..head[u + 1] {
            let nd = d + w[e as usize] as u64;
            let v = to[e as usize] as usize;
            if nd < dist[v] {
                dist[v] = nd;
                h.push(nd, v as i32);
            }
        }
    }

    // Tổng khoảng cách là duy nhất bất kể heap phá hoà kiểu gì, nên checksum ổn định.
    // The distance sum is unique no matter how the heap breaks ties, so the checksum is stable.
    let (mut sum, mut reach) = (0u64, 0u64);
    for &d in &dist {
        if d != INF {
            sum = sum.wrapping_add(d);
            reach += 1;
        }
    }

    let ms = t.ms();
    let mut c = Checksum::new();
    c.add_u64(sum);
    c.add_u64(reach);
    report(ms, &c.hex());
}
