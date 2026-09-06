// dijkstra — đường đi ngắn nhất trên đồ thị thưa sinh sẵn, dùng heap nhị phân tự viết.
// Đo truy cập bộ nhớ rải rác cộng với một cấu trúc dữ liệu có nhánh rẽ khó đoán.
// dijkstra — shortest paths over a generated sparse graph using a hand-written binary
// heap. This measures scattered memory access plus a data structure whose branches
// the CPU cannot predict.
package main

import "langbench/gocommon"

const inf = ^uint64(0)

// Heap viết tay chứ không dùng container/heap: mọi ngôn ngữ phải chạy đúng cùng một
// thuật toán thì so sánh mới có nghĩa.
// A hand-written heap rather than container/heap: the comparison only means something
// if every language runs the same algorithm.
type heap struct {
	d []uint64
	v []int32
}

func (h *heap) push(d uint64, v int32) {
	h.d = append(h.d, d)
	h.v = append(h.v, v)
	i := len(h.d) - 1
	for i > 0 {
		p := (i - 1) / 2
		if h.d[p] <= h.d[i] {
			break
		}
		h.d[p], h.d[i] = h.d[i], h.d[p]
		h.v[p], h.v[i] = h.v[i], h.v[p]
		i = p
	}
}

func (h *heap) pop() {
	last := len(h.d) - 1
	h.d[0], h.d[last] = h.d[last], h.d[0]
	h.v[0], h.v[last] = h.v[last], h.v[0]
	h.d = h.d[:last]
	h.v = h.v[:last]
	i, sz := 0, len(h.d)
	for {
		l, r, m := i*2+1, i*2+2, i
		if l < sz && h.d[l] < h.d[m] {
			m = l
		}
		if r < sz && h.d[r] < h.d[m] {
			m = r
		}
		if m == i {
			break
		}
		h.d[m], h.d[i] = h.d[i], h.d[m]
		h.v[m], h.v[i] = h.v[i], h.v[m]
		i = m
	}
}

func main() {
	n := int(common.Param("n", 200000))
	deg := int(common.Param("deg", 8))

	// Đồ thị dựng ở dạng CSR bằng cùng một LCG ở cả bốn ngôn ngữ. Phần dựng nằm ngoài
	// đồng hồ — bài này đo tìm đường, không đo sinh dữ liệu.
	// CSR graph built from the same LCG in all four languages. Construction sits outside
	// the clock: this benchmark measures the search, not the data generation.
	head := make([]int32, n+1)
	to := make([]int32, n*deg)
	w := make([]uint32, n*deg)
	rng := common.NewLcg(12345)
	for i := 0; i <= n; i++ {
		head[i] = int32(i * deg)
	}
	for i := range to {
		to[i] = int32(rng.Next() % uint32(n))
		w[i] = 1 + rng.Next()%1000
	}

	t := common.NewTimer()

	dist := make([]uint64, n)
	for i := range dist {
		dist[i] = inf
	}

	h := &heap{d: make([]uint64, 0, 1<<16), v: make([]int32, 0, 1<<16)}
	dist[0] = 0
	h.push(0, 0)
	for len(h.d) > 0 {
		d, u := h.d[0], h.v[0]
		h.pop()
		if d > dist[u] {
			continue // bản cũ đã lỗi thời / a stale copy
		}
		for e := head[u]; e < head[u+1]; e++ {
			nd := d + uint64(w[e])
			v := to[e]
			if nd < dist[v] {
				dist[v] = nd
				h.push(nd, v)
			}
		}
	}

	// Tổng khoảng cách là duy nhất bất kể heap phá hoà kiểu gì, nên checksum ổn định.
	// The distance sum is unique no matter how the heap breaks ties, so the checksum is stable.
	var sum, reach uint64
	for _, d := range dist {
		if d != inf {
			sum += d
			reach++
		}
	}

	ms := t.Ms()
	c := common.NewChecksum()
	c.AddU64(sum)
	c.AddU64(reach)
	common.Report(ms, c.Hex())
}
