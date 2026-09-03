// startup — in một dòng rồi thoát. Không dùng Common: bài này đo đúng chi phí
// khởi động, mà với Java thì đó là chi phí bật cả JVM.
// startup — print one line and exit. No Common: this measures startup cost itself,
// which for Java means the cost of booting the whole JVM.
public class Main {
    public static void main(String[] args) {
        System.out.print("{\"ms\": 0.000, \"checksum\": \"00000001\"}\n");
    }
}
