// sort — sắp xếp mảng số nguyên 32-bit bằng hàm sort của thư viện chuẩn.
// sort — sort an array of 32-bit integers with the standard library's sort.
#[path = "../_common/common.rs"]
mod common;
use common::*;

fn main() {
    let n = param("n", 3_000_000) as usize;
    let mut v = vec![0u32; n];
    let mut rng = Lcg::new(42);
    for i in 0..n {
        v[i] = rng.next();
    }

    let t = Timer::new();
    v.sort_unstable();
    let ms = t.ms();

    let mut sum: u32 = 0;
    let mut i = 0usize;
    while i < n {
        sum = sum.wrapping_add(v[i]);
        i += 1000;
    }
    let mut c = Checksum::new();
    c.add(v[0]); c.add(v[n - 1]); c.add(sum);
    report(ms, &c.hex());
}
