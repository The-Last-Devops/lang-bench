// hashmap — bảng băm địa chỉ mở TỰ VIẾT, khoá chuỗi. Xem main.cpp để biết vì sao.
// hashmap — a hand-written open-addressing hash table with string keys. See main.cpp.
package main

import (
	"strconv"

	"langbench/gocommon"
)

func hashKey(s string) uint32 {
	h := uint32(2166136261)
	for i := 0; i < len(s); i++ {
		h ^= uint32(s[i])
		h *= 16777619
	}
	return h
}

type table struct {
	keys []string
	vals []uint32
	used []bool
	mask uint32
}

func newTable(cap int) *table {
	return &table{
		keys: make([]string, cap),
		vals: make([]uint32, cap),
		used: make([]bool, cap),
		mask: uint32(cap - 1),
	}
}

func (t *table) put(k string, v uint32) {
	i := hashKey(k) & t.mask
	for t.used[i] {
		if t.keys[i] == k {
			t.vals[i] = v
			return
		}
		i = (i + 1) & t.mask
	}
	t.used[i] = true
	t.keys[i] = k
	t.vals[i] = v
}

// Dò dừng ở ô trống đầu tiên: bảng này không bao giờ xoá nên ô trống chứng minh khoá vắng mặt.
// Probing stops at the first empty slot: this table never deletes, so empty proves absent.
func (t *table) get(k string) (uint32, bool) {
	i := hashKey(k) & t.mask
	for t.used[i] {
		if t.keys[i] == k {
			return t.vals[i], true
		}
		i = (i + 1) & t.mask
	}
	return 0, false
}

func main() {
	n := int(common.Param("n", 1000000))

	keys := make([]string, n)
	absent := make([]string, n/2)
	for i := range keys {
		keys[i] = "key" + strconv.Itoa(i)
	}
	for i := range absent {
		absent[i] = "nokey" + strconv.Itoa(i)
	}

	capacity := 1
	for capacity < n*2 {
		capacity *= 2
	}

	t := common.NewTimer()

	m := newTable(capacity)
	for i, k := range keys {
		m.put(k, uint32(uint64(i)*7))
	}

	var sum, hits, misses uint32
	for _, k := range keys {
		if v, ok := m.get(k); ok {
			hits++
			sum += v
		}
	}
	for _, k := range absent {
		if _, ok := m.get(k); !ok {
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
