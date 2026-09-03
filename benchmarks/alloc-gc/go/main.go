// alloc-gc — cấp rồi thả hàng triệu object nhỏ, để GC của Go tự dọn.
// alloc-gc — allocate and drop millions of small objects, letting Go's GC clean up.
package main

import "langbench/gocommon"

type Node struct {
	value uint32
	next  *Node
}

func main() {
	batches := int(common.Param("batches", 400))
	per := int(common.Param("per", 5000))
	rng := common.NewLcg(42)

	t := common.NewTimer()
	var total uint32
	for b := 0; b < batches; b++ {
		var head *Node
		for i := 0; i < per; i++ {
			head = &Node{value: rng.Next(), next: head}
		}
		for p := head; p != nil; p = p.next {
			total += p.value
		}
		head = nil // thả tham chiếu, GC lo phần còn lại / drop the reference, the GC does the rest
		_ = head
	}
	ms := t.Ms()

	c := common.NewChecksum()
	c.Add(total)
	c.Add(uint32(batches * per))
	common.Report(ms, c.Hex())
}
