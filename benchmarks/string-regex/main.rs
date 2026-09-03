// string-regex — khớp regex trên 200k dòng log. Rust dùng crate `regex` (không có trong std).
// string-regex — match a regex over 200k log lines. Rust uses the `regex` crate (not in std).
#[path = "../_common/common.rs"]
mod common;
use common::*;
use regex::Regex;

const PATTERN: &str =
    r#"^(\d+\.\d+\.\d+\.\d+) - \[([0-9-]+)\] "(GET|POST) (\S+) HTTP/1\.1" (\d{3}) (\d+)$"#;

fn main() {
    let n = param("n", 200_000);

    let mut lines: Vec<String> = Vec::with_capacity(n as usize);
    let mut rng = Lcg::new(42);
    for i in 0..n {
        let a = rng.next() % 256;
        let b = rng.next() % 256;
        let day = rng.next() % 28 + 1;
        let post = rng.next() % 4 == 0;
        let status = if rng.next() % 10 < 8 { 200 } else if rng.next() % 2 == 1 { 404 } else { 500 };
        let bytes = rng.next() % 100000;
        lines.push(format!(
            "10.0.{}.{} - [2026-08-{:02}] \"{} /path/{} HTTP/1.1\" {} {}",
            a, b, day, if post { "POST" } else { "GET" }, i, status, bytes
        ));
    }

    let t = Timer::new();
    let re = Regex::new(PATTERN).unwrap();
    let mut sum_bytes: u32 = 0;
    let mut ok200: u32 = 0;
    let mut posts: u32 = 0;
    let mut matched: u32 = 0;
    for line in &lines {
        if let Some(m) = re.captures(line) {
            matched += 1;
            if &m[3] == "POST" {
                posts += 1;
            }
            if m[5].parse::<u32>().unwrap() == 200 {
                ok200 += 1;
            }
            sum_bytes = sum_bytes.wrapping_add(m[6].parse::<u32>().unwrap());
        }
    }
    let ms = t.ms();

    let mut c = Checksum::new();
    c.add(sum_bytes); c.add(ok200); c.add(posts); c.add(matched);
    report(ms, &c.hex());
}
