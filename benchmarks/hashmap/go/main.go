// hashmap — chèn và tra cứu khóa chuỗi, đo bảng băm dựng sẵn của Go.
// hashmap — insert and look up string keys, measuring Go's built-in map.
package main

import (
	"strconv"

	"langbench/gocommon"
)

func main() {
	n := int(common.Param("n", 1000000))
	t := common.NewTimer()
	m := make(map[string]uint32, n)
	for i := 0; i < n; i++ {
		m["key"+strconv.Itoa(i)] = uint32(uint64(i) * 7)
	}

	var sum, hits, misses uint32
	for i := 0; i < n; i++ {
		if v, ok := m["key"+strconv.Itoa(i)]; ok {
			hits++
			sum += v
		}
	}
	for i := 0; i < n/2; i++ {
		if _, ok := m["nokey"+strconv.Itoa(i)]; !ok {
			misses++
		}
	}
	ms := t.Ms()

	c := common.NewChecksum()
	c.Add(sum)
	c.Add(hits)
	c.Add(misses)
	common.Report(ms, c.Hex())
}
