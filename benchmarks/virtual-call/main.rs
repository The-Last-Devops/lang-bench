// virtual-call — gọi qua Box<dyn Trait> trên mảng trộn lẫn bốn kiểu. Xem main.cpp để biết
// vì sao mảng phải trộn lẫn.
// virtual-call — dispatch through Box<dyn Trait> over an array of four mixed kinds.
// See main.cpp for why the array must be mixed.
#[path = "../_common/common.rs"]
mod common;
use common::*;

trait Shape {
    fn area(&self) -> u32;
}

struct Square(u32);
struct Rect(u32, u32);
struct Tri(u32, u32);
struct Line(u32);

impl Shape for Square {
    fn area(&self) -> u32 { self.0.wrapping_mul(self.0) }
}
impl Shape for Rect {
    fn area(&self) -> u32 { self.0.wrapping_mul(self.1) }
}
impl Shape for Tri {
    fn area(&self) -> u32 { self.0.wrapping_mul(self.1) / 2 }
}
impl Shape for Line {
    fn area(&self) -> u32 { self.0 }
}

fn main() {
    let n = param("n", 1000000) as usize;
    let passes = param("passes", 20) as usize;

    let mut rng = Lcg::new(5);
    let mut v: Vec<Box<dyn Shape>> = Vec::with_capacity(n);
    for _ in 0..n {
        let kind = rng.next() % 4;
        let a = rng.next() % 1000;
        let b = rng.next() % 1000;
        v.push(match kind {
            0 => Box::new(Square(a)) as Box<dyn Shape>,
            1 => Box::new(Rect(a, b)) as Box<dyn Shape>,
            2 => Box::new(Tri(a, b)) as Box<dyn Shape>,
            _ => Box::new(Line(a)) as Box<dyn Shape>,
        });
    }

    let t = Timer::new();
    let mut sum: u32 = 0;
    for _ in 0..passes {
        for s in &v {
            sum = sum.wrapping_add(s.area());
        }
    }
    let ms = t.ms();

    let mut c = Checksum::new();
    c.add(sum);
    c.add(passes as u32);
    report(ms, &c.hex());
}
