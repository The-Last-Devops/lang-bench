// parallel — chia matmul cho nhiều luồng bằng std::thread::scope (không dùng crate ngoài).
// parallel — split matmul across threads with std::thread::scope (no external crate).
#[path = "../_common/common.rs"]
mod common;
use common::*;

fn main() {
    let n = param("n", 256) as usize;
    let mut threads = param("threads", 0) as usize;
    if threads == 0 {
        threads = std::thread::available_parallelism().map(|v| v.get()).unwrap_or(1);
    }

    let mut a = vec![0i64; n * n];
    let mut b = vec![0i64; n * n];
    let mut c = vec![0i64; n * n];
    for i in 0..n {
        for j in 0..n {
            a[i * n + j] = ((i * 31 + j * 17) % 100) as i64;
            b[i * n + j] = ((i * 13 + j * 7) % 100) as i64;
        }
    }
    let a = &a;
    let b = &b;

    let t = Timer::new();
    // Cắt c thành từng khối hàng, mỗi luồng sở hữu khối của mình.
    // Slice c into row blocks; each thread owns its own block.
    let rows_per: Vec<usize> = (0..threads)
        .map(|w| (n * (w + 1) / threads) - (n * w / threads))
        .collect();
    let mut rest: &mut [i64] = &mut c;
    let mut blocks: Vec<(usize, &mut [i64])> = Vec::with_capacity(threads);
    let mut row0 = 0usize;
    for r in rows_per {
        let (head, tail) = rest.split_at_mut(r * n);
        blocks.push((row0, head));
        rest = tail;
        row0 += r;
    }

    std::thread::scope(|s| {
        for (lo, block) in blocks {
            s.spawn(move || {
                let rows = block.len() / n;
                for bi in 0..rows {
                    let i = lo + bi;
                    for k in 0..n {
                        let aik = a[i * n + k];
                        for j in 0..n {
                            block[bi * n + j] += aik * b[k * n + j];
                        }
                    }
                }
            });
        }
    });

    let mut sum: u64 = 0;
    for v in &c {
        sum = sum.wrapping_add(*v as u64);
    }
    let ms = t.ms();

    let mut ck = Checksum::new();
    ck.add_u64(sum);
    report(ms, &ck.hex());
}
