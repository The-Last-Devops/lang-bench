// string-regex — khớp regex trên 200k dòng log, dùng java.util.regex.
// string-regex — match a regex over 200k log lines using java.util.regex.
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Main {
    static final String PATTERN =
        "^(\\d+\\.\\d+\\.\\d+\\.\\d+) - \\[([0-9-]+)\\] \"(GET|POST) (\\S+) HTTP/1\\.1\" (\\d{3}) (\\d+)$";

    public static void main(String[] args) {
        int n = (int) Common.param(args, "n", 200000);

        String[] lines = new String[n];
        Common.Lcg rng = new Common.Lcg(42);
        for (int i = 0; i < n; i++) {
            long a = rng.next() % 256;
            long b = rng.next() % 256;
            long day = rng.next() % 28 + 1;
            boolean post = rng.next() % 4 == 0;
            long status = 200;
            if (rng.next() % 10 >= 8) status = rng.next() % 2 == 1 ? 404 : 500;
            long bytes = rng.next() % 100000;
            lines[i] = String.format(
                "10.0.%d.%d - [2026-08-%02d] \"%s /path/%d HTTP/1.1\" %d %d",
                a, b, day, post ? "POST" : "GET", i, status, bytes);
        }

        Common.Timer t = new Common.Timer();
        Pattern re = Pattern.compile(PATTERN);
        int sumBytes = 0;
        int ok200 = 0;
        int posts = 0;
        int matched = 0;
        for (String line : lines) {
            Matcher m = re.matcher(line);
            if (m.matches()) {
                matched++;
                if (m.group(3).equals("POST")) posts++;
                if (Integer.parseInt(m.group(5)) == 200) ok200++;
                sumBytes += Integer.parseInt(m.group(6));
            }
        }
        double ms = t.ms();

        Common.Checksum c = new Common.Checksum();
        c.add(sumBytes);
        c.add(ok200);
        c.add(posts);
        c.add(matched);
        Common.report(ms, c.hex());
    }
}
