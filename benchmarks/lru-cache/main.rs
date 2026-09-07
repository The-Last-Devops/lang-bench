// lru-cache — cache LRU TỰ VIẾT trên mảng phẳng. Không dùng HashMap của thư viện chuẩn.
// Xem main.cpp để biết vì sao dùng dây xích thay cho địa chỉ mở.
// lru-cache — a hand-written LRU cache over flat arrays; no standard-library HashMap.
// See main.cpp for why this chains instead of open-addressing.
#[path = "../_common/common.rs"]
mod common;
use common::*;

fn main() {
    let cap = param("cap", 100000) as usize;
    let ops = param("ops", 2000000) as usize;
    let space = (cap * 3) as u32;

    let mut rng = Lcg::new(31);
    let mut keys = vec![0u32; ops];
    for k in keys.iter_mut() {
        *k = rng.next() % space;
    }

    let mut buckets = 1usize;
    while buckets < cap * 2 {
        buckets *= 2;
    }
    let mask = (buckets - 1) as u32;

    let mut head = vec![-1i32; buckets];
    let mut nxt = vec![-1i32; cap];
    let mut key = vec![0u32; cap];
    let mut val = vec![0u32; cap];
    let mut prev_l = vec![-1i32; cap];
    let mut next_l = vec![-1i32; cap];
    let mut lru_head: i32 = -1;
    let mut lru_tail: i32 = -1;
    let mut used: usize = 0;

    let t = Timer::new();

    let (mut hits, mut misses, mut sum): (u32, u32, u32) = (0, 0, 0);

    for i in 0..ops {
        let k = keys[i];
        let b = ((k.wrapping_mul(2654435761)) & mask) as usize;

        let mut node = head[b];
        while node >= 0 && key[node as usize] != k {
            node = nxt[node as usize];
        }

        if node >= 0 {
            hits += 1;
            sum = sum.wrapping_add(val[node as usize]);
            // Đưa lên đầu: tháo khỏi vị trí cũ rồi nối vào đầu.
            // Move to front: unlink from where it is, then link at the head.
            if lru_head != node {
                let p = prev_l[node as usize];
                let nx = next_l[node as usize];
                if p >= 0 { next_l[p as usize] = nx; }
                if nx >= 0 { prev_l[nx as usize] = p; }
                if lru_tail == node { lru_tail = p; }
                prev_l[node as usize] = -1;
                next_l[node as usize] = lru_head;
                if lru_head >= 0 { prev_l[lru_head as usize] = node; }
                lru_head = node;
            }
            continue;
        }

        misses += 1;
        let slot: i32;
        if used < cap {
            slot = used as i32;
            used += 1;
        } else {
            // Đầy: đuổi phần tử ở cuối, tháo nó khỏi rổ cũ.
            // Full: evict the tail and unlink it from its old bucket.
            slot = lru_tail;
            let ob = ((key[slot as usize].wrapping_mul(2654435761)) & mask) as usize;
            let mut cur = head[ob];
            let mut prev: i32 = -1;
            while cur >= 0 && cur != slot {
                prev = cur;
                cur = nxt[cur as usize];
            }
            if prev >= 0 { nxt[prev as usize] = nxt[slot as usize]; }
            else { head[ob] = nxt[slot as usize]; }

            let p = prev_l[slot as usize];
            if p >= 0 { next_l[p as usize] = -1; }
            lru_tail = p;
            if lru_head == slot { lru_head = -1; }
        }

        key[slot as usize] = k;
        val[slot as usize] = k.wrapping_mul(2).wrapping_add(1);
        nxt[slot as usize] = head[b];
        head[b] = slot;

        prev_l[slot as usize] = -1;
        next_l[slot as usize] = lru_head;
        if lru_head >= 0 { prev_l[lru_head as usize] = slot; }
        lru_head = slot;
        if lru_tail < 0 { lru_tail = slot; }
    }

    let ms = t.ms();
    let mut c = Checksum::new();
    c.add(hits);
    c.add(misses);
    c.add(sum);
    report(ms, &c.hex());
}
