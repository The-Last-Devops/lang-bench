// string-build — nối chuỗi và định dạng số, việc mà code thật làm nhiều nhất (log,
// template, sinh HTML). Cách mỗi ngôn ngữ biểu diễn chuỗi lộ ra rõ nhất ở đây.
// string-build — appending and number formatting, the thing real code does most (logs,
// templates, HTML). How a language represents strings shows up most sharply here.
#[path = "../_common/common.rs"]
mod common;
use common::*;
use std::fmt::Write;

fn main() {
    let n = param("n", 400000);
    let t = Timer::new();

    let mut s = String::with_capacity((n as usize) * 4);
    for i in 0..n {
        let _ = write!(s, "{},", i % 1000);
    }

    // Cộng có trọng số theo vị trí: đổi chỗ hai ký tự là checksum đổi, khác với cộng thuần.
    // A position-weighted sum: swapping two characters changes it, unlike a plain sum.
    let mut sum: u32 = 0;
    for (i, b) in s.as_bytes().iter().enumerate() {
        sum = sum.wrapping_add((i as u32 + 1).wrapping_mul(*b as u32));
    }

    let ms = t.ms();
    let mut c = Checksum::new();
    c.add(sum);
    c.add_u64(s.len() as u64);
    report(ms, &c.hex());
}
