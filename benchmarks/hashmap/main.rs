// hashmap — chèn và tra cứu khóa chuỗi, đo bảng băm của thư viện chuẩn.
// hashmap — insert and look up string keys, measuring the standard hash table.
#[path = "../_common/common.rs"]
mod common;
use common::*;
use std::collections::HashMap;

fn main() {
    let n = param("n", 1_000_000);
    let t = Timer::new();
    let mut m: HashMap<String, u32> = HashMap::with_capacity(n as usize);
    for i in 0..n {
        m.insert(format!("key{}", i), (i as u64 * 7) as u32);
    }

    let mut sum: u32 = 0;
    let mut hits: u32 = 0;
    let mut misses: u32 = 0;
    for i in 0..n {
        if let Some(v) = m.get(&format!("key{}", i)) {
            hits += 1;
            sum = sum.wrapping_add(*v);
        }
    }
    for i in 0..(n / 2) {
        if m.get(&format!("nokey{}", i)).is_none() {
            misses += 1;
        }
    }
    let ms = t.ms();

    let mut c = Checksum::new();
    c.add(sum); c.add(hits); c.add(misses);
    report(ms, &c.hex());
}
