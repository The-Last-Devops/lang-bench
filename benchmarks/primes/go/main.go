// primes — sàng Eratosthenes, đo vòng lặp chặt và truy cập mảng lớn.
// primes — sieve of Eratosthenes, measuring tight loops over a large array.
package main

import "langbench/gocommon"

func main() {
	n := int(common.Param("n", 10000000))
	t := common.NewTimer()
	composite := make([]uint8, n+1)
	for i := 2; i*i <= n; i++ {
		if composite[i] == 0 {
			for j := i * i; j <= n; j += i {
				composite[j] = 1
			}
		}
	}

	var count, sum uint32
	for i := 2; i <= n; i++ {
		if composite[i] == 0 {
			count++
			sum += uint32(i)
		}
	}
	ms := t.Ms()

	c := common.NewChecksum()
	c.Add(count)
	c.Add(sum)
	common.Report(ms, c.Hex())
}
