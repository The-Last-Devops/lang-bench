// binary-trees — dựng rồi huỷ hàng loạt cây nhị phân. Đo chi phí cấp phát và thu hồi
// bộ nhớ theo cụm nhỏ, ngắn hạn — nơi bộ cấp phát và GC lộ rõ nhất sự khác nhau.
// binary-trees — build and tear down many binary trees. This measures the cost of
// small, short-lived allocations in bulk, where allocators and GCs differ most.
#[path = "../_common/common.rs"]
mod common;
use common::*;

enum Node {
    Leaf,
    Branch(Box<Node>, Box<Node>),
}

fn build(depth: i64) -> Node {
    if depth > 0 {
        Node::Branch(Box::new(build(depth - 1)), Box::new(build(depth - 1)))
    } else {
        Node::Leaf
    }
}

fn check(n: &Node) -> u64 {
    match n {
        Node::Leaf => 1,
        Node::Branch(l, r) => 1 + check(l) + check(r),
    }
}

fn main() {
    let max_depth = param("depth", 16);
    let t = Timer::new();

    let mut total: u64 = 0;
    let mut d = 4;
    while d <= max_depth {
        // Cây càng nông thì dựng càng nhiều, để mỗi vòng làm lượng việc tương đương.
        // Shallower trees are built more often, so every round does comparable work.
        let iters = 1i64 << (max_depth - d + 4);
        for _ in 0..iters {
            let n = build(d);
            total = total.wrapping_add(check(&n));
            // n rời phạm vi ở đây — Rust trả bộ nhớ ngay, không chờ GC.
            // n goes out of scope here: Rust frees at once, with no GC to wait for.
        }
        d += 2;
    }

    let ms = t.ms();
    let mut c = Checksum::new();
    c.add_u64(total);
    report(ms, &c.hex());
}
