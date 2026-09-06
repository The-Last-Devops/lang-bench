// sort-objects — sắp xếp mảng bản ghi bằng hàm so sánh. Xem main.cpp để biết vì sao.
// sort-objects — sorting records through a comparator. See main.cpp for why.
#[path = "../_common/common.rs"]
mod common;
use common::*;

#[derive(Clone, Copy)]
struct Rec {
    key: u32,
    id: u32,
}

fn main() {
    let n = param("n", 1000000) as usize;

    let mut rng = Lcg::new(99);
    let mut v: Vec<Rec> = (0..n)
        .map(|i| Rec { key: rng.next(), id: i as u32 })
        .collect();

    let t = Timer::new();
    // sort_unstable_by: thứ tự cuối vẫn duy nhất vì khoá gồm cả id, nên không cần
    // sort ổn định — và đây là thứ người ta thật sự viết khi khoá đã đủ phân biệt.
    // sort_unstable_by: the order is still unique because the key includes id, so
    // stability buys nothing — and this is what one actually writes for a total key.
    v.sort_unstable_by(|a, b| a.key.cmp(&b.key).then(a.id.cmp(&b.id)));
    let mut sum: u32 = 0;
    for (i, r) in v.iter().enumerate() {
        sum = sum.wrapping_add((i as u32 + 1).wrapping_mul(r.key ^ r.id));
    }
    let ms = t.ms();

    let mut c = Checksum::new();
    c.add(sum);
    c.add(v[0].key);
    c.add(v[n - 1].key);
    report(ms, &c.hex());
}
