// string-build — nối chuỗi và định dạng số, việc mà code thật làm nhiều nhất (log,
// template, sinh HTML). Cách mỗi ngôn ngữ biểu diễn chuỗi lộ ra rõ nhất ở đây.
// string-build — appending and number formatting, the thing real code does most (logs,
// templates, HTML). How a language represents strings shows up most sharply here.
#[path = "../_common/common.rs"]
mod common;
use common::*;

fn main() {
    let n = param("n", 400000);
    let t = Timer::new();

    // Chuyển số bằng tay, không dùng write!/format! — xem main.cpp để biết vì sao.
    // Hand-rolled conversion instead of write!/format! — see main.cpp for why.
    let mut s = String::with_capacity((n as usize) * 4);
    let mut buf = [0u8; 12];
    for i in 0..n {
        let mut v = i % 1000;
        let mut len = 0usize;
        loop {
            buf[len] = b'0' + (v % 10) as u8;
            len += 1;
            v /= 10;
            if v == 0 { break; }
        }
        while len > 0 {
            len -= 1;
            s.push(buf[len] as char);
        }
        s.push(',');
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
