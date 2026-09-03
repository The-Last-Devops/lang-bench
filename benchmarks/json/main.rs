// json — dựng 100k record, serialize ra chuỗi, parse lại, đọc số liệu.
// Dùng serde_json::Value (giá trị động), không dùng struct derive — để so cho công bằng.
// json — build 100k records, serialize to a string, parse it back, read the fields.
// Uses serde_json::Value (dynamic), not derived structs, to keep the comparison fair.
#[path = "../_common/common.rs"]
mod common;
use common::*;
use serde_json::{Map, Value};

fn main() {
    let n = param("n", 100_000);

    let t = Timer::new();
    let mut docs: Vec<Value> = Vec::with_capacity(n as usize);
    for i in 0..n {
        let mut rec = Map::new();
        rec.insert("id".to_string(), Value::from(i));
        rec.insert("name".to_string(), Value::from(format!("user{}", i)));
        rec.insert("score".to_string(), Value::from((i * 37) % 1000));
        rec.insert("active".to_string(), Value::from(i % 3 == 0));
        docs.push(Value::Object(rec));
    }
    let docs = Value::Array(docs);
    let text = serde_json::to_string(&docs).unwrap();
    let back: Value = serde_json::from_str(&text).unwrap();

    let mut sum_id: u32 = 0;
    let mut sum_score: u32 = 0;
    let mut active: u32 = 0;
    for rec in back.as_array().unwrap() {
        sum_id = sum_id.wrapping_add(rec["id"].as_i64().unwrap() as u32);
        sum_score = sum_score.wrapping_add(rec["score"].as_i64().unwrap() as u32);
        if rec["active"].as_bool().unwrap() {
            active += 1;
        }
    }
    let ms = t.ms();

    let mut c = Checksum::new();
    c.add(sum_id); c.add(sum_score); c.add(active); c.add(text.len() as u32);
    report(ms, &c.hex());
}
