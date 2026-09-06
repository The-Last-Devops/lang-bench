// sort — merge sort đáy-lên TỰ VIẾT trên mảng số nguyên 32-bit.
// Xem main.cpp để biết vì sao bỏ sort của thư viện chuẩn.
// sort — a hand-written bottom-up merge sort over 32-bit integers.
// See main.cpp for why the standard library's sort was dropped.
#[path = "../_common/common.rs"]
mod common;
use common::*;

fn main() {
    let n = param("n", 3000000) as usize;
    let mut v = vec![0u32; n];
    let mut buf = vec![0u32; n];
    let mut rng = Lcg::new(42);
    for x in v.iter_mut() {
        *x = rng.next();
    }

    let t = Timer::new();

    // `flip` cho biết dữ liệu đang nằm ở mảng nào. Rust không cho giữ hai con trỏ thô rồi
    // hoán vai như C++, nên vai trò được theo dõi bằng một cờ.
    // `flip` says which array currently holds the data. Rust will not let two raw pointers
    // swap roles the way C++ does, so the roles are tracked by a flag instead.
    let mut flip = false;
    let mut width = 1usize;
    while width < n {
        {
            let (a, b): (&[u32], &mut [u32]) = if flip { (&buf, &mut v) } else { (&v, &mut buf) };
            let mut lo = 0usize;
            while lo < n {
                let mid = (lo + width).min(n);
                let hi = (lo + width * 2).min(n);
                let (mut i, mut j, mut k) = (lo, mid, lo);
                while i < mid && j < hi {
                    if a[i] <= a[j] { b[k] = a[i]; i += 1; } else { b[k] = a[j]; j += 1; }
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

    let ms = t.ms();

    let mut sum: u32 = 0;
    let mut i = 0usize;
    while i < n { sum = sum.wrapping_add(v[i]); i += 1000; }
    let mut c = Checksum::new();
    c.add(v[0]); c.add(v[n - 1]); c.add(sum);
    report(ms, &c.hex());
}
