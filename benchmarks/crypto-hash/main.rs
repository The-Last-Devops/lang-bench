// crypto-hash — SHA-256 trên 200 MB, dùng crate `sha2` (có tối ưu assembly cho arm64/x86).
// crypto-hash — SHA-256 over 200 MB using the `sha2` crate (with arm64/x86 asm optimisations).
#[path = "../_common/common.rs"]
mod common;
use common::*;
use sha2::{Digest, Sha256};

fn main() {
    let iters = param("iters", 200);
    let chunk: usize = 1 << 20;

    let mut buf = vec![0u8; chunk];
    for i in 0..chunk {
        buf[i] = ((i * 31 + 7) & 0xff) as u8;
    }

    let t = Timer::new();
    let mut hasher = Sha256::new();
    for _ in 0..iters {
        hasher.update(&buf);
    }
    let digest = hasher.finalize();
    let ms = t.ms();

    let head = ((digest[0] as u32) << 24) | ((digest[1] as u32) << 16)
             | ((digest[2] as u32) << 8) | (digest[3] as u32);
    let mut c = Checksum::new();
    c.add(head);
    c.add(iters as u32);
    report(ms, &c.hex());
}
