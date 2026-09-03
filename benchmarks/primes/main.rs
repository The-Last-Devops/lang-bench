// primes — sàng Eratosthenes, đo vòng lặp chặt và truy cập mảng lớn.
// primes — sieve of Eratosthenes, measuring tight loops over a large array.
#[path = "../_common/common.rs"]
mod common;
use common::*;

fn main() {
    let n = param("n", 10_000_000) as usize;
    let t = Timer::new();
    let mut composite = vec![0u8; n + 1];
    let mut i = 2usize;
    while i * i <= n {
        if composite[i] == 0 {
            let mut j = i * i;
            while j <= n {
                composite[j] = 1;
                j += i;
            }
        }
        i += 1;
    }

    let mut count: u32 = 0;
    let mut sum: u32 = 0;
    for i in 2..=n {
        if composite[i] == 0 {
            count += 1;
            sum = sum.wrapping_add(i as u32);
        }
    }
    let ms = t.ms();

    let mut c = Checksum::new();
    c.add(count);
    c.add(sum);
    report(ms, &c.hex());
}
