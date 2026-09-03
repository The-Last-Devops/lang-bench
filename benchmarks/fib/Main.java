// fib — đệ quy thuần, đo chi phí gọi hàm và stack.
// fib — plain recursion, measuring call and stack cost.
public class Main {
    static long fib(long n) {
        return n < 2 ? n : fib(n - 1) + fib(n - 2);
    }

    public static void main(String[] args) {
        long n = Common.param(args, "n", 32);
        Common.Timer t = new Common.Timer();
        long v = fib(n);
        double ms = t.ms();
        Common.Checksum c = new Common.Checksum();
        c.add((int) (v & 0xffffffffL));
        Common.report(ms, c.hex());
    }
}
