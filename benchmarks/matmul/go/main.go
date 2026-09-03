// matmul — nhân ma trận N×N kiểu ngây thơ, đo thông lượng số thực và cache.
// matmul — naive N×N matrix multiply, measuring float throughput and cache behaviour.
package main

import (
	"math"

	"langbench/gocommon"
)

func main() {
	n := int(common.Param("n", 256))
	a := make([]float64, n*n)
	b := make([]float64, n*n)
	c := make([]float64, n*n)
	for i := 0; i < n; i++ {
		for j := 0; j < n; j++ {
			a[i*n+j] = float64((i*31 + j*17) % 100)
			b[i*n+j] = float64((i*13 + j*7) % 100)
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
	sum := 0.0
	for _, v := range c {
		sum += v
	}
	ms := t.Ms()

	ck := common.NewChecksum()
	ck.Add(uint32(math.Mod(sum, 4294967296.0)))
	common.Report(ms, ck.Hex())
}
