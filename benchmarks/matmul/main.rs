// matmul — nhân ma trận N×N kiểu ngây thơ trên số nguyên 64-bit, đo thông lượng vòng
// lặp chặt và hành vi cache. Xem ghi chú trong main.cpp về lý do bỏ f64.
// matmul — naive N×N matrix multiply over 64-bit integers, measuring tight-loop
// throughput and cache behaviour. See main.cpp for why f64 was dropped.
#[path = "../_common/common.rs"]
mod common;
use common::*;

fn main() {
    let n = param("n", 256) as usize;
    let mut a = vec![0i64; n * n];
    let mut b = vec![0i64; n * n];
    let mut c = vec![0i64; n * n];
    for i in 0..n {
        for j in 0..n {
            a[i * n + j] = ((i * 31 + j * 17) % 100) as i64;
            b[i * n + j] = ((i * 13 + j * 7) % 100) as i64;
        }
    }

    let t = Timer::new();
    for i in 0..n {
        for k in 0..n {
            let aik = a[i * n + k];
            for j in 0..n {
                c[i * n + j] += aik * b[k * n + j];
            }
        }
    }
    let mut sum: u64 = 0;
    for v in &c {
        sum = sum.wrapping_add(*v as u64);
    }
    let ms = t.ms();

    let mut ck = Checksum::new();
    ck.add_u64(sum);
    report(ms, &ck.hex());
}
