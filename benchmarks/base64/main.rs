// base64 — mã hoá rồi giải mã một khối dữ liệu. Toàn thao tác dịch bit và tra bảng trên
// mảng byte: không thư viện, không cấp phát vặt. Xem main.cpp để biết chi tiết.
// base64 — encode a block of data, then decode it back. Pure bit-shifting and table
// lookups over byte arrays, no libraries. See main.cpp for the details.
#[path = "../_common/common.rs"]
mod common;
use common::*;

const ALPHA: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

fn main() {
    let size = param("size", 3000000) as usize;

    let mut src = vec![0u8; size];
    let mut rng = Lcg::new(7);
    for b in src.iter_mut() {
        *b = (rng.next() >> 24) as u8;
    }

    let mut rev = [-1i8; 256];
    for (i, &ch) in ALPHA.iter().enumerate() {
        rev[ch as usize] = i as i8;
    }

    let t = Timer::new();

    let enc_len = (size + 2) / 3 * 4;
    let mut enc = vec![0u8; enc_len];
    let mut o = 0usize;
    let mut i = 0usize;
    while i < size {
        let mut v = (src[i] as u32) << 16;
        if i + 1 < size { v |= (src[i + 1] as u32) << 8; }
        if i + 2 < size { v |= src[i + 2] as u32; }
        enc[o] = ALPHA[((v >> 18) & 63) as usize]; o += 1;
        enc[o] = ALPHA[((v >> 12) & 63) as usize]; o += 1;
        enc[o] = if i + 1 < size { ALPHA[((v >> 6) & 63) as usize] } else { b'=' }; o += 1;
        enc[o] = if i + 2 < size { ALPHA[(v & 63) as usize] } else { b'=' }; o += 1;
        i += 3;
    }

    let mut dec = vec![0u8; size];
    let mut d = 0usize;
    let mut j = 0usize;
    while j < enc_len {
        let c0 = rev[enc[j] as usize] as i32;
        let c1 = rev[enc[j + 1] as usize] as i32;
        let c2 = if enc[j + 2] == b'=' { -1 } else { rev[enc[j + 2] as usize] as i32 };
        let c3 = if enc[j + 3] == b'=' { -1 } else { rev[enc[j + 3] as usize] as i32 };
        let mut v = ((c0 as u32) << 18) | ((c1 as u32) << 12);
        if c2 >= 0 { v |= (c2 as u32) << 6; }
        if c3 >= 0 { v |= c3 as u32; }
        if d < size { dec[d] = ((v >> 16) & 0xff) as u8; d += 1; }
        if c2 >= 0 && d < size { dec[d] = ((v >> 8) & 0xff) as u8; d += 1; }
        if c3 >= 0 && d < size { dec[d] = (v & 0xff) as u8; d += 1; }
        j += 4;
    }

    let mut enc_sum: u32 = 0;
    let mut dec_sum: u32 = 0;
    for (i, &b) in enc.iter().enumerate() {
        enc_sum = enc_sum.wrapping_add((i as u32 + 1).wrapping_mul(b as u32));
    }
    for (i, &b) in dec[..d].iter().enumerate() {
        dec_sum = dec_sum.wrapping_add((i as u32 + 1).wrapping_mul(b as u32));
    }

    let ms = t.ms();
    let mut c = Checksum::new();
    c.add(enc_sum);
    c.add(dec_sum);
    c.add_u64(enc_len as u64);
    report(ms, &c.hex());
}
