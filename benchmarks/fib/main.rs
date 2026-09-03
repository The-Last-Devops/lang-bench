// fib — đệ quy thuần, đo chi phí gọi hàm và stack.
// fib — plain recursion, measuring call and stack cost.
#[path = "../_common/common.rs"]
mod common;
use common::*;

fn fib(n: i64) -> u64 {
    if n < 2 { n as u64 } else { fib(n - 1) + fib(n - 2) }
}

fn main() {
    let n = param("n", 32);
    let t = Timer::new();
    let v = fib(n);
    let ms = t.ms();
    let mut c = Checksum::new();
    c.add((v & 0xffff_ffff) as u32);
    report(ms, &c.hex());
}
