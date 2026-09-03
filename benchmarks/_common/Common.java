// Tiện ích dùng chung cho các bài test Java.
// Shared helpers for the Java benchmarks.
public final class Common {

    /** Đồng hồ đo phần việc thật. / Clock around the real work only. */
    public static final class Timer {
        private final long t0 = System.nanoTime();

        public double ms() {
            return (System.nanoTime() - t0) / 1_000_000.0;
        }
    }

    /**
     * Checksum 32-bit, phải khớp với mọi ngôn ngữ khác. Java không có kiểu
     * unsigned nên mọi phép tính ở đây dùng int rồi diễn giải lại là unsigned.
     * 32-bit checksum, must match every other language. Java has no unsigned
     * type, so this computes in int and reinterprets as unsigned.
     */
    public static final class Checksum {
        private int h = (int) 2166136261L;

        public void add(int v) {
            for (int i = 0; i < 4; i++) {
                h ^= (v >>> (i * 8)) & 0xff;
                h *= 16777619;
            }
        }

        public void addLong(long v) {
            add((int) (v & 0xffffffffL));
            add((int) (v >>> 32));
        }

        public String hex() {
            return String.format("%08x", h);
        }
    }

    /** Sinh số giả ngẫu nhiên xác định. / Deterministic PRNG. */
    public static final class Lcg {
        private int s;

        public Lcg(int seed) {
            this.s = seed;
        }

        /** Trả về giá trị unsigned 32-bit đóng trong long. / Unsigned 32-bit value in a long. */
        public long next() {
            s = s * 1664525 + 1013904223;
            return s & 0xffffffffL;
        }

        public int nextInt() {
            s = s * 1664525 + 1013904223;
            return s;
        }
    }

    /** Đọc tham số key=value. / Read a key=value parameter. */
    public static long param(String[] args, String key, long fallback) {
        String prefix = key + "=";
        for (String a : args) {
            if (a.startsWith(prefix)) {
                return Long.parseLong(a.substring(prefix.length()));
            }
        }
        return fallback;
    }

    /** Dòng duy nhất mà runner đọc. / The single line the runner parses. */
    public static void report(double ms, String checksum) {
        System.out.printf("{\"ms\": %.3f, \"checksum\": \"%s\"}%n", ms, checksum);
    }

    private Common() {}
}
