// json — dựng 100k record, serialize ra chuỗi, parse lại, đọc số liệu.
// Cả 5 ngôn ngữ đều dùng giá trị ĐỘNG (không phải struct sinh sẵn) để công bằng.
// json — build 100k records, serialize to a string, parse it back, read the fields.
// All five languages use DYNAMIC values (not generated structs), to keep it fair.
#include "common.hpp"
#include "json.hpp"

int main(int argc, char** argv) {
  const long n = lb::param(argc, argv, "n", 100000);

  lb::Timer t;
  lbjson::Value docs = lbjson::Value::make_arr();
  docs.arr.reserve((size_t)n);
  for (long i = 0; i < n; ++i) {
    lbjson::Value rec = lbjson::Value::make_obj();
    rec.obj.emplace_back("id", lbjson::Value::make_int(i));
    rec.obj.emplace_back("name", lbjson::Value::make_str("user" + std::to_string(i)));
    rec.obj.emplace_back("score", lbjson::Value::make_int((i * 37) % 1000));
    rec.obj.emplace_back("active", lbjson::Value::make_bool(i % 3 == 0));
    docs.arr.push_back(std::move(rec));
  }
  std::string text = lbjson::dump(docs);
  lbjson::Value back = lbjson::parse(text);

  uint32_t sum_id = 0, sum_score = 0, active = 0;
  for (const auto& rec : back.arr) {
    sum_id = (uint32_t)(sum_id + (uint32_t)rec.find("id")->i);
    sum_score = (uint32_t)(sum_score + (uint32_t)rec.find("score")->i);
    if (rec.find("active")->b) ++active;
  }
  double ms = t.ms();

  lb::Checksum c;
  c.add(sum_id); c.add(sum_score); c.add(active); c.add((uint32_t)text.size());
  lb::report(ms, lb::hex8(c.value()));
}
