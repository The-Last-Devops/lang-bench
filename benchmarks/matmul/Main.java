// matmul — nhân ma trận N×N kiểu ngây thơ, đo thông lượng số thực.
// matmul — naive N×N matrix multiply, measuring float throughput.
public class Main {
    public static void main(String[] args) {
        int n = (int) Common.param(args, "n", 256);
        double[] a = new double[n * n];
        double[] b = new double[n * n];
        double[] c = new double[n * n];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                a[i * n + j] = (i * 31 + j * 17) % 100;
                b[i * n + j] = (i * 13 + j * 7) % 100;
            }
        }

        Common.Timer t = new Common.Timer();
        for (int i = 0; i < n; i++) {
            for (int k = 0; k < n; k++) {
                double aik = a[i * n + k];
                for (int j = 0; j < n; j++) {
                    c[i * n + j] += aik * b[k * n + j];
                }
            }
        }
        double sum = 0.0;
        for (double v : c) sum += v;
        double ms = t.ms();

        Common.Checksum ck = new Common.Checksum();
        ck.add((int) (long) (sum % 4294967296.0));
        Common.report(ms, ck.hex());
    }
}
