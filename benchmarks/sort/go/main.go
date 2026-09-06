// sort — merge sort đáy-lên TỰ VIẾT trên mảng số nguyên 32-bit.
// Xem main.cpp để biết vì sao bỏ sort của thư viện chuẩn.
// sort — a hand-written bottom-up merge sort over 32-bit integers.
// See main.cpp for why the standard library's sort was dropped.
package main

import "langbench/gocommon"

func main() {
	n := int(common.Param("n", 3000000))
	v := make([]uint32, n)
	buf := make([]uint32, n)
	rng := common.NewLcg(42)
	for i := range v {
		v[i] = rng.Next()
	}

	t := common.NewTimer()

	// Hai lát cắt đổi vai sau mỗi vòng, nên không phải chép ngược lại giữa chừng.
	// The two slices swap roles after each pass, so nothing is copied back midway.
	a, b := v, buf
	for width := 1; width < n; width *= 2 {
		for lo := 0; lo < n; lo += width * 2 {
			mid := lo + width
			if mid > n {
				mid = n
			}
			hi := lo + width*2
			if hi > n {
				hi = n
			}
			i, j, k := lo, mid, lo
			for i < mid && j < hi {
				if a[i] <= a[j] {
					b[k] = a[i]
					i++
				} else {
					b[k] = a[j]
					j++
				}
				k++
			}
			for i < mid {
				b[k] = a[i]
				i++
				k++
			}
			for j < hi {
				b[k] = a[j]
				j++
				k++
			}
		}
		a, b = b, a
	}
	// Số vòng có thể lẻ, khi đó kết quả đang nằm ở mảng phụ.
	// The pass count can be odd, leaving the result in the scratch array.
	if &a[0] != &v[0] {
		copy(v, a)
	}

	ms := t.Ms()

	var sum uint32
	for i := 0; i < n; i += 1000 {
		sum += v[i]
	}
	c := common.NewChecksum()
	c.Add(v[0])
	c.Add(v[n-1])
	c.Add(sum)
	common.Report(ms, c.Hex())
}
