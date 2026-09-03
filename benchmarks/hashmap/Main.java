// hashmap — chèn và tra cứu khóa chuỗi, đo HashMap của thư viện chuẩn.
// hashmap — insert and look up string keys, measuring the standard library HashMap.
import java.util.HashMap;

public class Main {
    public static void main(String[] args) {
        int n = (int) Common.param(args, "n", 1000000);
        Common.Timer t = new Common.Timer();
        HashMap<String, Integer> m = new HashMap<>(n * 2);
        for (int i = 0; i < n; i++) {
            m.put("key" + i, (int) ((long) i * 7));
        }

        int sum = 0;
        int hits = 0;
        int misses = 0;
        for (int i = 0; i < n; i++) {
            Integer v = m.get("key" + i);
            if (v != null) {
                hits++;
                sum += v;
            }
        }
        for (int i = 0; i < n / 2; i++) {
            if (!m.containsKey("nokey" + i)) misses++;
        }
        double ms = t.ms();

        Common.Checksum c = new Common.Checksum();
        c.add(sum);
        c.add(hits);
        c.add(misses);
        Common.report(ms, c.hex());
    }
}
