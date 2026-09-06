// matmul — nhân ma trận N×N kiểu ngây thơ trên số nguyên 64-bit, đo thông lượng vòng
// lặp chặt và hành vi cache. Xem ghi chú trong main.cpp về lý do bỏ f64.
// matmul — naive N×N matrix multiply over 64-bit integers, measuring tight-loop
// throughput and cache behaviour. See main.cpp for why f64 was dropped.
package main

import "langbench/gocommon"

func main() {
	n := int(common.Param("n", 256))
	a := make([]int64, n*n)
	b := make([]int64, n*n)
	c := make([]int64, n*n)
	for i := 0; i < n; i++ {
		for j := 0; j < n; j++ {
			a[i*n+j] = int64((i*31 + j*17) % 100)
			b[i*n+j] = int64((i*13 + j*7) % 100)
		}
	}

	t := common.NewTimer()
	for i := 0; i < n; i++ {
		for k := 0; k < n; k++ {
			aik := a[i*n+k]
			for j := 0; j < n; j++ {
				c[i*n+j] += aik * b[k*n+j]
			}
		}
	}
	var sum uint64
	for _, v := range c {
		sum += uint64(v)
	}
	ms := t.Ms()

	ck := common.NewChecksum()
	ck.AddU64(sum)
	common.Report(ms, ck.Hex())
}
