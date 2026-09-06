// matmul — nhân ma trận N×N kiểu ngây thơ trên số nguyên 64-bit.
// Xem ghi chú trong main.cpp về lý do bỏ f64.
// matmul — naive N×N matrix multiply over 64-bit integers.
// See main.cpp for why f64 was dropped.
public class Main {
    public static void main(String[] args) {
        int n = (int) Common.param(args, "n", 256);
        long[] a = new long[n * n];
        long[] b = new long[n * n];
        long[] c = new long[n * n];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                a[i * n + j] = (i * 31 + j * 17) % 100;
                b[i * n + j] = (i * 13 + j * 7) % 100;
            }
        }

        Common.Timer t = new Common.Timer();
        for (int i = 0; i < n; i++) {
            for (int k = 0; k < n; k++) {
                long aik = a[i * n + k];
                for (int j = 0; j < n; j++) {
                    c[i * n + j] += aik * b[k * n + j];
                }
            }
        }
        long sum = 0;
        for (long v : c) sum += v;
        double ms = t.ms();

        Common.Checksum ck = new Common.Checksum();
        ck.addLong(sum);
        Common.report(ms, ck.hex());
    }
}
