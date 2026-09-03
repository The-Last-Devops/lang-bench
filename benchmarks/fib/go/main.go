// fib — đệ quy thuần, đo chi phí gọi hàm và stack.
// fib — plain recursion, measuring call and stack cost.
package main

import "langbench/gocommon"

func fib(n int64) uint64 {
	if n < 2 {
		return uint64(n)
	}
	return fib(n-1) + fib(n-2)
}

func main() {
	n := common.Param("n", 32)
	t := common.NewTimer()
	v := fib(n)
	ms := t.Ms()
	c := common.NewChecksum()
	c.Add(uint32(v & 0xffffffff))
	common.Report(ms, c.Hex())
}
