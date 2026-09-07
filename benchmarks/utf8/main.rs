// utf8 — dựng một chuỗi nhiều ngôn ngữ rồi duyệt qua từng ký tự Unicode.
// Xem main.cpp để biết vì sao bài này đo được thứ mà bài chuỗi khác không đo.
// utf8 — build a multilingual string, then walk it character by character.
// See main.cpp for what this measures that the other string benchmarks cannot.
#[path = "../_common/common.rs"]
mod common;
use common::*;

fn main() {
    let n = param("n", 6000000) as usize;

    // Bốn dải: ASCII 1 byte, Latin 2 byte, CJK 3 byte, ký hiệu 4 byte.
    // Four ranges: ASCII at 1 byte, Latin at 2, CJK at 3, symbols at 4.
    let mut rng = Lcg::new(2024);
    let mut cps: Vec<u32> = Vec::with_capacity(n);
    for _ in 0..n {
        let r = rng.next();
        cps.push(match r & 3 {
            0 => 0x20 + (r >> 8) % 95,
            1 => 0xC0 + (r >> 8) % 64,
            2 => 0x4E00 + (r >> 8) % 0x5000,
            _ => 0x1F300 + (r >> 8) % 0x300,
        });
    }

    // String của Rust luôn là UTF-8 hợp lệ, nên phần dựng chuỗi cũng chính là phần mã hoá.
    // A Rust String is always valid UTF-8, so building the string is the encoding step.
    let mut s = String::with_capacity(n * 3);
    for &cp in &cps {
        s.push(char::from_u32(cp).unwrap());
    }

    let t = Timer::new();

    // .chars() giải mã UTF-8 và trả về từng điểm mã — đây là cách viết đúng của Rust,
    // và cũng chính là chi phí mà bài test muốn đo.
    // .chars() decodes UTF-8 and yields code points: the idiomatic Rust way, and the cost
    // this benchmark exists to measure.
    let (mut sum, mut wide, mut idx): (u32, u32, u32) = (0, 0, 0);
    for ch in s.chars() {
        let cp = ch as u32;
        idx += 1;
        sum = sum.wrapping_add(idx.wrapping_mul(cp));
        if cp > 0x7F {
            wide += 1;
        }
    }

    let ms = t.ms();
    let mut c = Checksum::new();
    c.add(sum);
    c.add(wide);
    c.add(idx);
    c.add_u64(s.len() as u64);
    report(ms, &c.hex());
}
