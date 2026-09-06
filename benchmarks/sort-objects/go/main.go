// sort-objects — merge sort đáy-lên TỰ VIẾT trên mảng bản ghi. Xem main.cpp để biết vì sao.
// sort-objects — a hand-written bottom-up merge sort over records. See main.cpp for why.
package main

import "langbench/gocommon"

type rec struct {
	key uint32
	id  uint32
}

func before(a, b rec) bool {
	if a.key != b.key {
		return a.key < b.key
	}
	return a.id < b.id
}

func main() {
	n := int(common.Param("n", 400000))

	rng := common.NewLcg(99)
	v := make([]rec, n)
	buf := make([]rec, n)
	for i := range v {
		v[i] = rec{key: rng.Next(), id: uint32(i)}
	}

	t := common.NewTimer()

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
				if before(a[j], a[i]) {
					b[k] = a[j]
					j++
				} else {
					b[k] = a[i]
					i++
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
	if &a[0] != &v[0] {
		copy(v, a)
	}

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
