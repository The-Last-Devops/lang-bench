// sort-objects — merge sort đáy-lên TỰ VIẾT trên mảng bản ghi. Xem main.cpp để biết vì sao.
// sort-objects — a hand-written bottom-up merge sort over records. See main.cpp for why.
#[path = "../_common/common.rs"]
mod common;
use common::*;

#[derive(Clone, Copy)]
struct Rec {
    key: u32,
    id: u32,
}

#[inline]
fn before(a: Rec, b: Rec) -> bool {
    if a.key != b.key { a.key < b.key } else { a.id < b.id }
}

fn main() {
    let n = param("n", 400000) as usize;

    let mut rng = Lcg::new(99);
    let mut v: Vec<Rec> = (0..n).map(|i| Rec { key: rng.next(), id: i as u32 }).collect();
    let mut buf: Vec<Rec> = vec![Rec { key: 0, id: 0 }; n];

    let t = Timer::new();

    let mut flip = false;
    let mut width = 1usize;
    while width < n {
        {
            let (a, b): (&[Rec], &mut [Rec]) = if flip { (&buf, &mut v) } else { (&v, &mut buf) };
            let mut lo = 0usize;
            while lo < n {
                let mid = (lo + width).min(n);
                let hi = (lo + width * 2).min(n);
                let (mut i, mut j, mut k) = (lo, mid, lo);
                while i < mid && j < hi {
                    if before(a[j], a[i]) { b[k] = a[j]; j += 1; } else { b[k] = a[i]; i += 1; }
                    k += 1;
                }
                while i < mid { b[k] = a[i]; i += 1; k += 1; }
                while j < hi { b[k] = a[j]; j += 1; k += 1; }
                lo += width * 2;
            }
        }
        flip = !flip;
        width *= 2;
    }
    if flip {
        v.copy_from_slice(&buf);
    }

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
