// Tiện ích dùng chung cho các bài test Rust / Shared helpers for the Rust benchmarks.
#![allow(dead_code)]
use std::time::Instant;

/// Đồng hồ đo phần việc thật. / Clock around the real work only.
pub struct Timer(Instant);
impl Timer {
    pub fn new() -> Self { Timer(Instant::now()) }
    pub fn ms(&self) -> f64 { self.0.elapsed().as_secs_f64() * 1000.0 }
}

/// Checksum 32-bit, phải khớp với cả 4 ngôn ngữ kia.
/// 32-bit checksum, must match the other four languages.
pub struct Checksum(u32);
impl Checksum {
    pub fn new() -> Self { Checksum(2166136261) }
    pub fn add(&mut self, v: u32) {
        for i in 0..4 {
            self.0 ^= (v >> (i * 8)) & 0xff;
            self.0 = self.0.wrapping_mul(16777619);
        }
    }
    pub fn add_u64(&mut self, v: u64) {
        self.add((v & 0xffff_ffff) as u32);
        self.add((v >> 32) as u32);
    }
    pub fn value(&self) -> u32 { self.0 }
    pub fn hex(&self) -> String { format!("{:08x}", self.0) }
}

/// Sinh số giả ngẫu nhiên xác định. / Deterministic PRNG.
pub struct Lcg(u32);
impl Lcg {
    pub fn new(seed: u32) -> Self { Lcg(seed) }
    #[inline]
    pub fn next(&mut self) -> u32 {
        self.0 = self.0.wrapping_mul(1664525).wrapping_add(1013904223);
        self.0
    }
}

/// Đọc tham số key=value. / Read a key=value parameter.
pub fn param(key: &str, fallback: i64) -> i64 {
    let prefix = format!("{}=", key);
    std::env::args()
        .skip(1)
        .find_map(|a| a.strip_prefix(&prefix).and_then(|v| v.parse().ok()))
        .unwrap_or(fallback)
}

/// Dòng duy nhất mà runner đọc. / The single line the runner parses.
pub fn report(ms: f64, checksum: &str) {
    println!("{{\"ms\": {:.3}, \"checksum\": \"{}\"}}", ms, checksum);
}
