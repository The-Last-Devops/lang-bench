// binary-trees — dựng rồi huỷ hàng loạt cây nhị phân. Đo chi phí cấp phát và thu hồi
// bộ nhớ theo cụm nhỏ, ngắn hạn — nơi bộ cấp phát và GC lộ rõ nhất sự khác nhau.
// binary-trees — build and tear down many binary trees. This measures the cost of
// small, short-lived allocations in bulk, where allocators and GCs differ most.
package main

import "langbench/gocommon"

type node struct {
	l, r *node
}

func build(depth int64) *node {
	n := &node{}
	if depth > 0 {
		n.l = build(depth - 1)
		n.r = build(depth - 1)
	}
	return n
}

func check(n *node) uint64 {
	if n.l == nil {
		return 1
	}
	return 1 + check(n.l) + check(n.r)
}

func main() {
	maxDepth := common.Param("depth", 16)
	t := common.NewTimer()

	var total uint64
	for d := int64(4); d <= maxDepth; d += 2 {
		// Cây càng nông thì dựng càng nhiều, để mỗi vòng làm lượng việc tương đương.
		// Shallower trees are built more often, so every round does comparable work.
		iters := int64(1) << uint(maxDepth-d+4)
		for i := int64(0); i < iters; i++ {
			total += check(build(d))
			// Cây thành rác ngay tại đây — phần dọn dẹp thuộc về GC, và đó là thứ đang đo.
			// The tree becomes garbage right here; cleaning up is the GC's job, and that is what is being measured.
		}
	}

	ms := t.Ms()
	c := common.NewChecksum()
	c.AddU64(total)
	common.Report(ms, c.Hex())
}
