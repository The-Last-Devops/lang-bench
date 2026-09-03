// JSON tối giản cho Java — thư viện chuẩn Java KHÔNG có JSON (java.json chưa bao
// giờ vào JDK). Cùng lý do như bên C++, bài test này dùng parser/serializer tự
// viết ở đây, tạo ra giá trị động giống serde_json::Value / map[string]any /
// JSON.parse / json_decode. Jackson hay Gson sẽ nhanh hơn đáng kể.
//
// Minimal JSON for Java — the Java standard library has NO JSON (java.json never
// landed in the JDK). For the same reason as on the C++ side, this benchmark uses
// the hand-written parser/serializer below, producing dynamic values just like
// serde_json::Value / map[string]any / JSON.parse / json_decode. Jackson or Gson
// would be considerably faster.
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class Json {

    // ---------- serialize ----------

    public static String dump(Object value) {
        StringBuilder sb = new StringBuilder(1 << 16);
        write(value, sb);
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private static void write(Object v, StringBuilder out) {
        if (v == null) {
            out.append("null");
        } else if (v instanceof String s) {
            writeString(s, out);
        } else if (v instanceof Boolean b) {
            out.append(b ? "true" : "false");
        } else if (v instanceof Integer || v instanceof Long) {
            out.append(v.toString());
        } else if (v instanceof Double || v instanceof Float) {
            out.append(v.toString());
        } else if (v instanceof Map<?, ?> m) {
            out.append('{');
            boolean first = true;
            for (Map.Entry<?, ?> e : m.entrySet()) {
                if (!first) out.append(',');
                first = false;
                writeString(String.valueOf(e.getKey()), out);
                out.append(':');
                write(e.getValue(), out);
            }
            out.append('}');
        } else if (v instanceof List<?> l) {
            out.append('[');
            for (int i = 0; i < l.size(); i++) {
                if (i > 0) out.append(',');
                write(l.get(i), out);
            }
            out.append(']');
        } else {
            throw new IllegalArgumentException("json: kiểu không hỗ trợ / unsupported type: " + v.getClass());
        }
    }

    private static void writeString(String s, StringBuilder out) {
        out.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> {
                    if (c < 0x20) out.append(String.format("\\u%04x", (int) c));
                    else out.append(c);
                }
            }
        }
        out.append('"');
    }

    // ---------- parse ----------

    public static Object parse(String text) {
        Parser p = new Parser(text);
        return p.value();
    }

    private static final class Parser {
        private final String s;
        private int i = 0;

        Parser(String s) {
            this.s = s;
        }

        private RuntimeException fail(String what) {
            return new RuntimeException("json: " + what + " tại vị trí / at offset " + i);
        }

        private void ws() {
            while (i < s.length()) {
                char c = s.charAt(i);
                if (c == ' ' || c == '\n' || c == '\r' || c == '\t') i++;
                else break;
            }
        }

        private char peek() {
            return i < s.length() ? s.charAt(i) : '\0';
        }

        private void expect(char c) {
            if (peek() != c) throw fail("mong đợi / expected '" + c + "'");
            i++;
        }

        Object value() {
            ws();
            switch (peek()) {
                case '{': {
                    i++;
                    Map<String, Object> m = new LinkedHashMap<>();
                    ws();
                    if (peek() == '}') { i++; return m; }
                    while (true) {
                        ws();
                        String k = string();
                        ws();
                        expect(':');
                        m.put(k, value());
                        ws();
                        if (peek() == ',') { i++; continue; }
                        expect('}');
                        return m;
                    }
                }
                case '[': {
                    i++;
                    List<Object> a = new ArrayList<>();
                    ws();
                    if (peek() == ']') { i++; return a; }
                    while (true) {
                        a.add(value());
                        ws();
                        if (peek() == ',') { i++; continue; }
                        expect(']');
                        return a;
                    }
                }
                case '"':
                    return string();
                case 't':
                    if (s.startsWith("true", i)) { i += 4; return Boolean.TRUE; }
                    throw fail("literal xấu / bad literal");
                case 'f':
                    if (s.startsWith("false", i)) { i += 5; return Boolean.FALSE; }
                    throw fail("literal xấu / bad literal");
                case 'n':
                    if (s.startsWith("null", i)) { i += 4; return null; }
                    throw fail("literal xấu / bad literal");
                default:
                    return number();
            }
        }

        private String string() {
            expect('"');
            StringBuilder sb = new StringBuilder();
            while (i < s.length() && s.charAt(i) != '"') {
                char c = s.charAt(i);
                if (c == '\\') {
                    i++;
                    char e = s.charAt(i);
                    switch (e) {
                        case '"' -> sb.append('"');
                        case '\\' -> sb.append('\\');
                        case '/' -> sb.append('/');
                        case 'n' -> sb.append('\n');
                        case 'r' -> sb.append('\r');
                        case 't' -> sb.append('\t');
                        case 'b' -> sb.append('\b');
                        case 'f' -> sb.append('\f');
                        case 'u' -> {
                            sb.append((char) Integer.parseInt(s.substring(i + 1, i + 5), 16));
                            i += 4;
                        }
                        default -> throw fail("escape xấu / bad escape");
                    }
                    i++;
                } else {
                    sb.append(c);
                    i++;
                }
            }
            expect('"');
            return sb.toString();
        }

        private Object number() {
            int start = i;
            if (peek() == '-') i++;
            while (i < s.length() && s.charAt(i) >= '0' && s.charAt(i) <= '9') i++;
            boolean isDouble = false;
            if (peek() == '.') {
                isDouble = true;
                i++;
                while (i < s.length() && s.charAt(i) >= '0' && s.charAt(i) <= '9') i++;
            }
            if (peek() == 'e' || peek() == 'E') {
                isDouble = true;
                i++;
                if (peek() == '+' || peek() == '-') i++;
                while (i < s.length() && s.charAt(i) >= '0' && s.charAt(i) <= '9') i++;
            }
            String text = s.substring(start, i);
            return isDouble ? (Object) Double.valueOf(text) : (Object) Long.valueOf(text);
        }
    }

    private Json() {}
}
