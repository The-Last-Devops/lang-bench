// file-io — ghi tuần tự rồi đọc lại 256 MB. Đo I/O đĩa, không đo CPU.
// file-io — write then read back 256 MB sequentially. This measures disk I/O, not CPU.
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;

public class Main {
    public static void main(String[] args) throws Exception {
        int mb = (int) Common.param(args, "mb", 256);
        final int chunk = 1 << 20;
        final int sample = 4096;
        String dir = System.getenv("LB_TMPDIR");
        if (dir == null || dir.isEmpty()) dir = "/tmp";
        File file = new File(dir, "lang-bench-io-java.bin");

        // Buffer dựng MỘT LẦN, trước đồng hồ. / Buffer built ONCE, before the clock.
        byte[] buf = new byte[chunk];
        for (int j = 0; j < chunk; j++) buf[j] = (byte) ((j * 31 + 7) & 0xff);

        Common.Timer t = new Common.Timer();
        try (FileOutputStream out = new FileOutputStream(file)) {
            for (int k = 0; k < mb; k++) out.write(buf);
            out.flush();
            out.getFD().sync();
        }

        // Chỉ cộng 4 KB đầu mỗi chunk để xác minh — xem ghi chú ở main.cpp.
        // Verify by summing only the first 4 KB of each chunk — see the note in main.cpp.
        int sum = 0;
        long totalRead = 0;
        try (FileInputStream in = new FileInputStream(file)) {
            for (int k = 0; k < mb; k++) {
                int got = 0;
                while (got < chunk) {
                    int r = in.read(buf, got, chunk - got);
                    if (r <= 0) break;
                    got += r;
                }
                totalRead += got;
                int lim = Math.min(got, sample);
                for (int j = 0; j < lim; j++) sum += buf[j] & 0xff;
            }
        }
        double ms = t.ms();
        file.delete();

        Common.Checksum c = new Common.Checksum();
        c.add(sum);
        c.add((int) (totalRead >> 20));
        c.add(mb);
        Common.report(ms, c.hex());
    }
}
