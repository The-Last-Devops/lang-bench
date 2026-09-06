// parallel — chia matmul cho nhiều goroutine, đây là thứ Go làm gọn nhất.
// parallel — split matmul across goroutines, the thing Go expresses most cleanly.
package main

import (
	"runtime"
	"sync"

	"langbench/gocommon"
)

func main() {
	n := int(common.Param("n", 256))
	threads := int(common.Param("threads", 0))
	if threads <= 0 {
		threads = runtime.NumCPU()
	}

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
	var wg sync.WaitGroup
	for w := 0; w < threads; w++ {
		lo := n * w / threads
		hi := n * (w + 1) / threads
		wg.Add(1)
		go func(lo, hi int) {
			defer wg.Done()
			for i := lo; i < hi; i++ {
				for k := 0; k < n; k++ {
					aik := a[i*n+k]
					for j := 0; j < n; j++ {
						c[i*n+j] += aik * b[k*n+j]
					}
				}
			}
		}(lo, hi)
	}
	wg.Wait()
	var sum uint64
	for _, v := range c {
		sum += uint64(v)
	}
	ms := t.Ms()

	ck := common.NewChecksum()
	ck.AddU64(sum)
	common.Report(ms, ck.Hex())
}
