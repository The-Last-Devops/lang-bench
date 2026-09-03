// sort — sắp xếp mảng số nguyên 32-bit bằng slices.Sort của thư viện chuẩn.
// sort — sort an array of 32-bit integers with the standard library's slices.Sort.
package main

import (
	"slices"

	"langbench/gocommon"
)

func main() {
	n := int(common.Param("n", 3000000))
	v := make([]uint32, n)
	rng := common.NewLcg(42)
	for i := 0; i < n; i++ {
		v[i] = rng.Next()
	}

	t := common.NewTimer()
	slices.Sort(v)
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
