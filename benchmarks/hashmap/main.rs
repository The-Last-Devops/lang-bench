// hashmap — bảng băm địa chỉ mở TỰ VIẾT, khoá chuỗi. Xem main.cpp để biết vì sao.
// hashmap — a hand-written open-addressing hash table with string keys. See main.cpp.
#[path = "../_common/common.rs"]
mod common;
use common::*;

fn hash_key(s: &str) -> u32 {
    let mut h: u32 = 2166136261;
    for &b in s.as_bytes() {
        h ^= b as u32;
        h = h.wrapping_mul(16777619);
    }
    h
}

struct Table {
    keys: Vec<String>,
    vals: Vec<u32>,
    used: Vec<bool>,
    mask: u32,
}

impl Table {
    fn new(cap: usize) -> Self {
        Table {
            keys: vec![String::new(); cap],
            vals: vec![0; cap],
            used: vec![false; cap],
            mask: (cap - 1) as u32,
        }
    }

    fn put(&mut self, k: &str, v: u32) {
        let mut i = (hash_key(k) & self.mask) as usize;
        while self.used[i] {
            if self.keys[i] == k {
                self.vals[i] = v;
                return;
            }
            i = ((i as u32 + 1) & self.mask) as usize;
        }
        self.used[i] = true;
        self.keys[i] = k.to_string();
        self.vals[i] = v;
    }

    fn get(&self, k: &str) -> Option<u32> {
        let mut i = (hash_key(k) & self.mask) as usize;
        while self.used[i] {
            if self.keys[i] == k {
                return Some(self.vals[i]);
            }
            i = ((i as u32 + 1) & self.mask) as usize;
        }
        None
    }
}

fn main() {
    let n = param("n", 1000000) as usize;

    let keys: Vec<String> = (0..n).map(|i| format!("key{}", i)).collect();
    let absent: Vec<String> = (0..n / 2).map(|i| format!("nokey{}", i)).collect();

    let mut cap = 1usize;
    while cap < n * 2 {
        cap *= 2;
    }

    let t = Timer::new();

    let mut m = Table::new(cap);
    for (i, k) in keys.iter().enumerate() {
        m.put(k, (i as u64 * 7) as u32);
    }

    let (mut sum, mut hits, mut misses): (u32, u32, u32) = (0, 0, 0);
    for k in &keys {
        if let Some(v) = m.get(k) {
            hits += 1;
            sum = sum.wrapping_add(v);
        }
    }
    for k in &absent {
        if m.get(k).is_none() {
            misses += 1;
        }
    }

    let ms = t.ms();
    let mut c = Checksum::new();
    c.add(sum);
    c.add(hits);
    c.add(misses);
    report(ms, &c.hex());
}
