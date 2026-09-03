// primes — sàng Eratosthenes, đo vòng lặp chặt trên mảng byte lớn.
// primes — sieve of Eratosthenes, measuring tight loops over a large byte array.
public class Main {
    public static void main(String[] args) {
        int n = (int) Common.param(args, "n", 10000000);
        Common.Timer t = new Common.Timer();
        byte[] composite = new byte[n + 1];
        for (int i = 2; (long) i * i <= n; i++) {
            if (composite[i] == 0) {
                for (int j = i * i; j <= n; j += i) composite[j] = 1;
            }
        }

        int count = 0;
        int sum = 0;
        for (int i = 2; i <= n; i++) {
            if (composite[i] == 0) {
                count++;
                sum += i;
            }
        }
        double ms = t.ms();

        Common.Checksum c = new Common.Checksum();
        c.add(count);
        c.add(sum);
        Common.report(ms, c.hex());
    }
}
