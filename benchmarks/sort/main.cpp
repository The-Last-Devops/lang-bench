// sort — merge sort đáy-lên TỰ VIẾT trên mảng số nguyên 32-bit.
//
// Trước đây bài này gọi std::sort / sort_unstable / slices.Sort — tức là so THƯ VIỆN CHUẨN,
// không phải so ngôn ngữ. Chênh lệch khi đó rất lớn (C++ 204ms, Rust 45ms) nhưng lý do là
// Rust dùng pdqsort còn libstdc++ dùng introsort, hai thuật toán cách nhau mấy chục năm.
//
// Merge sort đáy-lên được chọn vì nó lặp lại y hệt ở bốn ngôn ngữ: không đệ quy, không chọn
// chốt, không rẽ nhánh nào phụ thuộc dữ liệu. Cùng số phép so sánh, cùng số lần chép — nên
// thứ còn lại đo được chính là chất lượng mã máy mà trình biên dịch sinh ra.
//
// sort — a hand-written bottom-up merge sort over 32-bit integers.
//
// This used to call std::sort / sort_unstable / slices.Sort, which compares STANDARD
// LIBRARIES rather than languages. The gap was large (C++ 204ms, Rust 45ms) but the reason
// was that Rust ships pdqsort while libstdc++ ships introsort — algorithms decades apart.
//
// Bottom-up merge sort was chosen because it repeats identically in all four languages: no
// recursion, no pivot choice, no data-dependent branching. The same comparisons and the same
// moves every time, so what is left to measure is the code the compiler generated.
#include "common.hpp"
#include <vector>

int main(int argc, char** argv) {
  const long n = lb::param(argc, argv, "n", 3000000);
  std::vector<uint32_t> v((size_t)n), buf((size_t)n);
  lb::Lcg rng(42);
  for (long i = 0; i < n; ++i) v[(size_t)i] = rng.next();

  lb::Timer t;

  // Trộn từng cặp đoạn dài `width`, tăng gấp đôi mỗi vòng, đổi vai hai mảng sau mỗi vòng
  // để không phải chép ngược lại.
  // Merge pairs of runs of length `width`, doubling each pass, swapping the two arrays'
  // roles after each pass so nothing has to be copied back.
  uint32_t* a = v.data();
  uint32_t* b = buf.data();
  for (size_t width = 1; width < (size_t)n; width *= 2) {
    for (size_t lo = 0; lo < (size_t)n; lo += width * 2) {
      size_t mid = lo + width < (size_t)n ? lo + width : (size_t)n;
      size_t hi = lo + width * 2 < (size_t)n ? lo + width * 2 : (size_t)n;
      size_t i = lo, j = mid, k = lo;
      while (i < mid && j < hi) b[k++] = a[i] <= a[j] ? a[i++] : a[j++];
      while (i < mid) b[k++] = a[i++];
      while (j < hi) b[k++] = a[j++];
    }
    uint32_t* tmp = a; a = b; b = tmp;
  }
  // Số vòng có thể lẻ, khi đó kết quả đang nằm ở mảng phụ.
  // The pass count can be odd, leaving the result in the scratch array.
  if (a != v.data()) for (size_t i = 0; i < (size_t)n; ++i) v[i] = a[i];

  double ms = t.ms();

  uint32_t sum = 0;
  for (long i = 0; i < n; i += 1000) sum = (uint32_t)(sum + v[(size_t)i]);
  lb::Checksum c;
  c.add(v[0]); c.add(v[(size_t)n - 1]); c.add(sum);
  lb::report(ms, lb::hex8(c.value()));
}
