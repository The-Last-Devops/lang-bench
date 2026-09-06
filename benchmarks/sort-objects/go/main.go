// sort-objects — sắp xếp mảng bản ghi bằng hàm so sánh. Xem main.cpp để biết vì sao.
// sort-objects — sorting records through a comparator. See main.cpp for why.
package main

import (
	"sort"

	"langbench/gocommon"
)

type rec struct {
	key uint32
	id  uint32
}

func main() {
	n := int(common.Param("n", 1000000))

	rng := common.NewLcg(99)
	v := make([]rec, n)
	for i := range v {
		v[i] = rec{key: rng.Next(), id: uint32(i)}
	}

	t := common.NewTimer()
	sort.Slice(v, func(a, b int) bool {
		if v[a].key != v[b].key {
			return v[a].key < v[b].key
		}
		return v[a].id < v[b].id
	})
	var sum uint32
	for i, r := range v {
		sum += uint32(i+1) * (r.key ^ r.id)
	}
	ms := t.Ms()

	c := common.NewChecksum()
	c.Add(sum)
	c.Add(v[0].key)
	c.Add(v[n-1].key)
	common.Report(ms, c.Hex())
}
