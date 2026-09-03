// sort — sắp xếp 3 triệu số nguyên bằng Arrays.sort (dual-pivot quicksort).
// Java KHÔNG có kiểu unsigned, nên phải dùng long[] để thứ tự sắp xếp khớp với
// các ngôn ngữ dùng uint32; sort int[] sẽ cho thứ tự khác vì bit dấu.
// sort — sort 3 million integers with Arrays.sort (dual-pivot quicksort).
// Java has NO unsigned type, so this uses long[] to get the same ordering as the
// uint32 languages; sorting int[] would order differently because of the sign bit.
import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        int n = (int) Common.param(args, "n", 3000000);
        long[] v = new long[n];
        Common.Lcg rng = new Common.Lcg(42);
        for (int i = 0; i < n; i++) v[i] = rng.next();

        Common.Timer t = new Common.Timer();
        Arrays.sort(v);
        double ms = t.ms();

        int sum = 0;
        for (int i = 0; i < n; i += 1000) sum += (int) v[i];
        Common.Checksum c = new Common.Checksum();
        c.add((int) v[0]);
        c.add((int) v[n - 1]);
        c.add(sum);
        Common.report(ms, c.hex());
    }
}
