// json — dựng 100k record, serialize, parse lại, đọc số liệu.
// Java KHÔNG có JSON trong thư viện chuẩn: bài này dùng Json.java tự viết trong repo.
// json — build 100k records, serialize, parse back, read fields.
// Java has NO JSON in its standard library: this uses the hand-written Json.java in the repo.
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class Main {
    @SuppressWarnings("unchecked")
    public static void main(String[] args) {
        int n = (int) Common.param(args, "n", 100000);

        Common.Timer t = new Common.Timer();
        List<Object> docs = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            Map<String, Object> rec = new LinkedHashMap<>();
            rec.put("id", (long) i);
            rec.put("name", "user" + i);
            rec.put("score", (long) ((i * 37) % 1000));
            rec.put("active", i % 3 == 0);
            docs.add(rec);
        }
        String text = Json.dump(docs);
        List<Object> back = (List<Object>) Json.parse(text);

        int sumId = 0;
        int sumScore = 0;
        int active = 0;
        for (Object raw : back) {
            Map<String, Object> rec = (Map<String, Object>) raw;
            sumId += (int) (long) (Long) rec.get("id");
            sumScore += (int) (long) (Long) rec.get("score");
            if ((Boolean) rec.get("active")) active++;
        }
        double ms = t.ms();

        Common.Checksum c = new Common.Checksum();
        c.add(sumId);
        c.add(sumScore);
        c.add(active);
        c.add(text.length());
        Common.report(ms, c.hex());
    }
}
