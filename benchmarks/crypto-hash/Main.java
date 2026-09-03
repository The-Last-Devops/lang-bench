// crypto-hash — SHA-256 trên 200 MB. MessageDigest của JDK có intrinsic dùng
// lệnh crypto của CPU trên arm64 và x86.
// crypto-hash — SHA-256 over 200 MB. The JDK's MessageDigest has intrinsics that use
// the CPU's crypto instructions on arm64 and x86.
import java.security.MessageDigest;

public class Main {
    public static void main(String[] args) throws Exception {
        int iters = (int) Common.param(args, "iters", 200);
        final int chunk = 1 << 20;

        byte[] buf = new byte[chunk];
        for (int i = 0; i < chunk; i++) buf[i] = (byte) ((i * 31 + 7) & 0xff);

        Common.Timer t = new Common.Timer();
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        for (int k = 0; k < iters; k++) md.update(buf);
        byte[] digest = md.digest();
        double ms = t.ms();

        int head = ((digest[0] & 0xff) << 24) | ((digest[1] & 0xff) << 16)
                 | ((digest[2] & 0xff) << 8) | (digest[3] & 0xff);
        Common.Checksum c = new Common.Checksum();
        c.add(head);
        c.add(iters);
        Common.report(ms, c.hex());
    }
}
