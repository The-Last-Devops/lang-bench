// matmul — nhân ma trận N×N kiểu ngây thơ, đo thông lượng số thực và cache.
// matmul — naive N×N matrix multiply, measuring float throughput and cache behaviour.
#[path = "../_common/common.rs"]
mod common;
use common::*;

fn main() {
    let n = param("n", 256) as usize;
    let mut a = vec![0.0f64; n * n];
    let mut b = vec![0.0f64; n * n];
    let mut c = vec![0.0f64; n * n];
    for i in 0..n {
        for j in 0..n {
            a[i * n + j] = ((i * 31 + j * 17) % 100) as f64;
            b[i * n + j] = ((i * 13 + j * 7) % 100) as f64;
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
    let mut sum = 0.0f64;
    for v in &c {
        sum += *v;
    }
    let ms = t.ms();

    let mut ck = Checksum::new();
    ck.add((sum % 4294967296.0) as u32);
    report(ms, &ck.hex());
}
