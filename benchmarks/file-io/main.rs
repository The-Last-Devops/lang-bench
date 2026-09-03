// file-io — ghi tuần tự rồi đọc lại 256 MB. Đo I/O đĩa, không đo CPU.
// file-io — write then read back 256 MB sequentially. This measures disk I/O, not CPU.
#[path = "../_common/common.rs"]
mod common;
use common::*;
use std::fs::{File, OpenOptions};
use std::io::{Read, Write};

fn main() {
    let mb = param("mb", 256) as usize;
    let chunk: usize = 1 << 20;
    let dir = std::env::var("LB_TMPDIR").unwrap_or_else(|_| "/tmp".to_string());
    let path = format!("{}/lang-bench-io-rust.bin", dir);

    // Buffer dựng MỘT LẦN, trước đồng hồ. / Buffer built ONCE, before the clock.
    let mut buf = vec![0u8; chunk];
    for j in 0..chunk {
        buf[j] = ((j * 31 + 7) & 0xff) as u8;
    }

    let t = Timer::new();
    {
        let mut f = OpenOptions::new().write(true).create(true).truncate(true).open(&path).unwrap();
        for _ in 0..mb {
            f.write_all(&buf).unwrap();
        }
        f.sync_all().unwrap();
    }

    // Chỉ cộng 4 KB đầu mỗi chunk để xác minh — xem ghi chú ở main.cpp.
    // Verify by summing only the first 4 KB of each chunk — see the note in main.cpp.
    const SAMPLE: usize = 4096;
    let mut sum: u32 = 0;
    let mut total_read: u64 = 0;
    {
        let mut f = File::open(&path).unwrap();
        for _ in 0..mb {
            let mut got = 0usize;
            while got < chunk {
                match f.read(&mut buf[got..]) {
                    Ok(0) | Err(_) => break,
                    Ok(r) => got += r,
                }
            }
            total_read += got as u64;
            let lim = got.min(SAMPLE);
            for j in 0..lim {
                sum = sum.wrapping_add(buf[j] as u32);
            }
        }
    }
    let ms = t.ms();
    let _ = std::fs::remove_file(&path);

    let mut c = Checksum::new();
    c.add(sum);
    c.add((total_read >> 20) as u32);
    c.add(mb as u32);
    report(ms, &c.hex());
}
