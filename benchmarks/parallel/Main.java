// parallel — chia matmul cho nhiều Thread. Java có luồng thật từ ngày đầu.
// parallel — split matmul across Threads. Java has had real threads from day one.
public class Main {
    public static void main(String[] args) throws Exception {
        final int n = (int) Common.param(args, "n", 256);
        int threads = (int) Common.param(args, "threads", 0);
        if (threads <= 0) threads = Runtime.getRuntime().availableProcessors();

        final double[] a = new double[n * n];
        final double[] b = new double[n * n];
        final double[] c = new double[n * n];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                a[i * n + j] = (i * 31 + j * 17) % 100;
                b[i * n + j] = (i * 13 + j * 7) % 100;
            }
        }

        Common.Timer t = new Common.Timer();
        Thread[] pool = new Thread[threads];
        for (int w = 0; w < threads; w++) {
            final int lo = (int) ((long) n * w / threads);
            final int hi = (int) ((long) n * (w + 1) / threads);
            pool[w] = new Thread(() -> {
                for (int i = lo; i < hi; i++) {
                    for (int k = 0; k < n; k++) {
                        double aik = a[i * n + k];
                        for (int j = 0; j < n; j++) c[i * n + j] += aik * b[k * n + j];
                    }
                }
            });
            pool[w].start();
        }
        for (Thread th : pool) th.join();
        double sum = 0.0;
        for (double v : c) sum += v;
        double ms = t.ms();

        Common.Checksum ck = new Common.Checksum();
        ck.add((int) (long) (sum % 4294967296.0));
        Common.report(ms, ck.hex());
    }
}
