// JSON tối giản cho C++ — thư viện chuẩn C++ KHÔNG có JSON, nên bài test này
// dùng parser/serializer tự viết ở đây. Nó tạo ra giá trị động (Value) giống
// serde_json::Value, map[string]any, JSON.parse và json_decode, để 5 ngôn ngữ
// làm đúng cùng một lượng việc. Một thư viện đã tối ưu (simdjson, RapidJSON)
// sẽ nhanh hơn đáng kể — con số của C++ ở bài này phải đọc kèm ghi chú đó.
//
// Minimal JSON for C++ — the C++ standard library has NO JSON, so this benchmark
// uses the hand-written parser/serializer below. It builds a dynamic Value, the
// same shape as serde_json::Value, map[string]any, JSON.parse and json_decode, so
// all five languages do the same amount of work. A tuned library (simdjson,
// RapidJSON) would be considerably faster — read the C++ number with that in mind.
#pragma once
#include <cstdint>
#include <map>
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>

namespace lbjson {

struct Value;
using Array = std::vector<Value>;
using Object = std::vector<std::pair<std::string, Value>>;

enum class Type { Null, Bool, Int, Double, String, Array, Object };

struct Value {
  Type type = Type::Null;
  bool b = false;
  int64_t i = 0;
  double d = 0.0;
  std::string s;
  Array arr;
  Object obj;

  Value() = default;
  static Value make_bool(bool v) { Value x; x.type = Type::Bool; x.b = v; return x; }
  static Value make_int(int64_t v) { Value x; x.type = Type::Int; x.i = v; return x; }
  static Value make_str(std::string v) { Value x; x.type = Type::String; x.s = std::move(v); return x; }
  static Value make_arr() { Value x; x.type = Type::Array; return x; }
  static Value make_obj() { Value x; x.type = Type::Object; return x; }

  const Value* find(const std::string& key) const {
    for (const auto& kv : obj)
      if (kv.first == key) return &kv.second;
    return nullptr;
  }
};

// ---------- serialize ----------

inline void dump_string(const std::string& s, std::string& out) {
  out += '"';
  for (char ch : s) {
    switch (ch) {
      case '"':  out += "\\\""; break;
      case '\\': out += "\\\\"; break;
      case '\n': out += "\\n";  break;
      case '\r': out += "\\r";  break;
      case '\t': out += "\\t";  break;
      default:
        if ((unsigned char)ch < 0x20) {
          char buf[8];
          snprintf(buf, sizeof buf, "\\u%04x", (unsigned char)ch);
          out += buf;
        } else {
          out += ch;
        }
    }
  }
  out += '"';
}

inline void dump(const Value& v, std::string& out) {
  switch (v.type) {
    case Type::Null:   out += "null"; break;
    case Type::Bool:   out += v.b ? "true" : "false"; break;
    case Type::Int:    out += std::to_string(v.i); break;
    case Type::Double: {
      char buf[32];
      snprintf(buf, sizeof buf, "%.17g", v.d);
      out += buf;
      break;
    }
    case Type::String: dump_string(v.s, out); break;
    case Type::Array:
      out += '[';
      for (size_t k = 0; k < v.arr.size(); ++k) {
        if (k) out += ',';
        dump(v.arr[k], out);
      }
      out += ']';
      break;
    case Type::Object:
      out += '{';
      for (size_t k = 0; k < v.obj.size(); ++k) {
        if (k) out += ',';
        dump_string(v.obj[k].first, out);
        out += ':';
        dump(v.obj[k].second, out);
      }
      out += '}';
      break;
  }
}

inline std::string dump(const Value& v) {
  std::string out;
  dump(v, out);
  return out;
}

// ---------- parse ----------

class Parser {
  const char* p_;
  const char* end_;

  [[noreturn]] void fail(const char* what) const {
    throw std::runtime_error(std::string("json: ") + what);
  }
  void skip_ws() {
    while (p_ < end_ && (*p_ == ' ' || *p_ == '\n' || *p_ == '\r' || *p_ == '\t')) ++p_;
  }
  char peek() const { return p_ < end_ ? *p_ : '\0'; }
  void expect(char c) {
    if (peek() != c) fail("unexpected character");
    ++p_;
  }

  std::string parse_string() {
    expect('"');
    std::string out;
    while (p_ < end_ && *p_ != '"') {
      if (*p_ == '\\') {
        ++p_;
        if (p_ >= end_) fail("truncated escape");
        switch (*p_) {
          case '"':  out += '"';  break;
          case '\\': out += '\\'; break;
          case '/':  out += '/';  break;
          case 'n':  out += '\n'; break;
          case 'r':  out += '\r'; break;
          case 't':  out += '\t'; break;
          case 'b':  out += '\b'; break;
          case 'f':  out += '\f'; break;
          case 'u': {
            if (end_ - p_ < 5) fail("truncated \\u");
            unsigned code = 0;
            for (int k = 1; k <= 4; ++k) {
              char h = p_[k];
              code <<= 4;
              if (h >= '0' && h <= '9') code |= (unsigned)(h - '0');
              else if (h >= 'a' && h <= 'f') code |= (unsigned)(h - 'a' + 10);
              else if (h >= 'A' && h <= 'F') code |= (unsigned)(h - 'A' + 10);
              else fail("bad hex in \\u");
            }
            p_ += 4;
            if (code < 0x80) {
              out += (char)code;
            } else if (code < 0x800) {
              out += (char)(0xC0 | (code >> 6));
              out += (char)(0x80 | (code & 0x3F));
            } else {
              out += (char)(0xE0 | (code >> 12));
              out += (char)(0x80 | ((code >> 6) & 0x3F));
              out += (char)(0x80 | (code & 0x3F));
            }
            break;
          }
          default: fail("bad escape");
        }
        ++p_;
      } else {
        out += *p_++;
      }
    }
    expect('"');
    return out;
  }

  Value parse_number() {
    const char* start = p_;
    if (peek() == '-') ++p_;
    while (p_ < end_ && *p_ >= '0' && *p_ <= '9') ++p_;
    bool is_double = false;
    if (peek() == '.') {
      is_double = true;
      ++p_;
      while (p_ < end_ && *p_ >= '0' && *p_ <= '9') ++p_;
    }
    if (peek() == 'e' || peek() == 'E') {
      is_double = true;
      ++p_;
      if (peek() == '+' || peek() == '-') ++p_;
      while (p_ < end_ && *p_ >= '0' && *p_ <= '9') ++p_;
    }
    std::string text(start, (size_t)(p_ - start));
    Value v;
    if (is_double) {
      v.type = Type::Double;
      v.d = strtod(text.c_str(), nullptr);
    } else {
      v.type = Type::Int;
      v.i = strtoll(text.c_str(), nullptr, 10);
    }
    return v;
  }

  bool literal(const char* word) {
    size_t len = strlen(word);
    if ((size_t)(end_ - p_) < len || strncmp(p_, word, len) != 0) return false;
    p_ += len;
    return true;
  }

 public:
  Parser(const char* data, size_t len) : p_(data), end_(data + len) {}

  Value parse_value() {
    skip_ws();
    switch (peek()) {
      case '{': {
        ++p_;
        Value v = Value::make_obj();
        skip_ws();
        if (peek() == '}') { ++p_; return v; }
        for (;;) {
          skip_ws();
          std::string key = parse_string();
          skip_ws();
          expect(':');
          v.obj.emplace_back(std::move(key), parse_value());
          skip_ws();
          if (peek() == ',') { ++p_; continue; }
          expect('}');
          return v;
        }
      }
      case '[': {
        ++p_;
        Value v = Value::make_arr();
        skip_ws();
        if (peek() == ']') { ++p_; return v; }
        for (;;) {
          v.arr.push_back(parse_value());
          skip_ws();
          if (peek() == ',') { ++p_; continue; }
          expect(']');
          return v;
        }
      }
      case '"': return Value::make_str(parse_string());
      case 't': if (literal("true")) return Value::make_bool(true); fail("bad literal");
      case 'f': if (literal("false")) return Value::make_bool(false); fail("bad literal");
      case 'n': if (literal("null")) return Value(); fail("bad literal");
      default:  return parse_number();
    }
  }
};

inline Value parse(const std::string& text) {
  Parser parser(text.data(), text.size());
  return parser.parse_value();
}

}  // namespace lbjson
