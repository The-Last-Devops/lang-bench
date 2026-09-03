// alloc-gc — cấp rồi thả hàng triệu object nhỏ, để GC của JVM tự dọn.
// alloc-gc — allocate and drop millions of small objects, letting the JVM's GC clean up.
public class Main {
    static final class Node {
        int value;
        Node next;

        Node(int value, Node next) {
            this.value = value;
            this.next = next;
        }
    }

    public static void main(String[] args) {
        int batches = (int) Common.param(args, "batches", 400);
        int per = (int) Common.param(args, "per", 5000);
        Common.Lcg rng = new Common.Lcg(42);

        Common.Timer t = new Common.Timer();
        int total = 0;
        for (int b = 0; b < batches; b++) {
            Node head = null;
            for (int i = 0; i < per; i++) head = new Node(rng.nextInt(), head);
            for (Node p = head; p != null; p = p.next) total += p.value;
            head = null; // thả tham chiếu / drop the reference
        }
        double ms = t.ms();

        Common.Checksum c = new Common.Checksum();
        c.add(total);
        c.add(batches * per);
        Common.report(ms, c.hex());
    }
}
