// alloc-gc — cấp rồi thả hàng triệu object nhỏ. Rust không có GC: Box, thả theo scope.
// alloc-gc — allocate and drop millions of small objects. Rust has no GC: Box, dropped by scope.
#[path = "../_common/common.rs"]
mod common;
use common::*;

struct Node {
    value: u32,
    next: Option<Box<Node>>,
}

fn main() {
    let batches = param("batches", 400);
    let per = param("per", 5000);
    let mut rng = Lcg::new(42);

    let t = Timer::new();
    let mut total: u32 = 0;
    for _ in 0..batches {
        let mut head: Option<Box<Node>> = None;
        for _ in 0..per {
            head = Some(Box::new(Node { value: rng.next(), next: head }));
        }
        let mut cursor = head.as_deref();
        while let Some(node) = cursor {
            total = total.wrapping_add(node.value);
            cursor = node.next.as_deref();
        }
        // Thả theo vòng lặp, tránh đệ quy sâu khi Drop.
        // Drop iteratively so Drop does not recurse thousands of frames deep.
        let mut cur = head;
        while let Some(mut node) = cur {
            cur = node.next.take();
        }
    }
    let ms = t.ms();

    let mut c = Checksum::new();
    c.add(total);
    c.add((batches * per) as u32);
    report(ms, &c.hex());
}
