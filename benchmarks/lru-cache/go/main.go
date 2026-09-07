// lru-cache — cache LRU TỰ VIẾT trên mảng phẳng. Không dùng map của Go.
// Xem main.cpp để biết vì sao dùng dây xích thay cho địa chỉ mở.
// lru-cache — a hand-written LRU cache over flat arrays; Go's map is not used.
// See main.cpp for why this chains instead of open-addressing.
package main

import "langbench/gocommon"

func main() {
	cap_ := int(common.Param("cap", 100000))
	ops := int(common.Param("ops", 2000000))
	space := uint32(cap_ * 3)

	rng := common.NewLcg(31)
	keys := make([]uint32, ops)
	for i := range keys {
		keys[i] = rng.Next() % space
	}

	buckets := 1
	for buckets < cap_*2 {
		buckets *= 2
	}
	mask := uint32(buckets - 1)

	head := make([]int32, buckets)
	for i := range head {
		head[i] = -1
	}
	nxt := make([]int32, cap_)
	prevL := make([]int32, cap_)
	nextL := make([]int32, cap_)
	for i := 0; i < cap_; i++ {
		nxt[i] = -1
		prevL[i] = -1
		nextL[i] = -1
	}
	key := make([]uint32, cap_)
	val := make([]uint32, cap_)
	lruHead, lruTail := int32(-1), int32(-1)
	used := 0

	t := common.NewTimer()

	var hits, misses, sum uint32

	for i := 0; i < ops; i++ {
		k := keys[i]
		b := (k * 2654435761) & mask

		node := head[b]
		for node >= 0 && key[node] != k {
			node = nxt[node]
		}

		if node >= 0 {
			hits++
			sum += val[node]
			// Đưa lên đầu: tháo khỏi vị trí cũ rồi nối vào đầu.
			// Move to front: unlink from where it is, then link at the head.
			if lruHead != node {
				p, nx := prevL[node], nextL[node]
				if p >= 0 {
					nextL[p] = nx
				}
				if nx >= 0 {
					prevL[nx] = p
				}
				if lruTail == node {
					lruTail = p
				}
				prevL[node] = -1
				nextL[node] = lruHead
				if lruHead >= 0 {
					prevL[lruHead] = node
				}
				lruHead = node
			}
			continue
		}

		misses++
		var slot int32
		if used < cap_ {
			slot = int32(used)
			used++
		} else {
			// Đầy: đuổi phần tử ở cuối, tháo nó khỏi rổ cũ.
			// Full: evict the tail and unlink it from its old bucket.
			slot = lruTail
			ob := (key[slot] * 2654435761) & mask
			cur, prev := head[ob], int32(-1)
			for cur >= 0 && cur != slot {
				prev = cur
				cur = nxt[cur]
			}
			if prev >= 0 {
				nxt[prev] = nxt[slot]
			} else {
				head[ob] = nxt[slot]
			}

			p := prevL[slot]
			if p >= 0 {
				nextL[p] = -1
			}
			lruTail = p
			if lruHead == slot {
				lruHead = -1
			}
		}

		key[slot] = k
		val[slot] = k*2 + 1
		nxt[slot] = head[b]
		head[b] = slot

		prevL[slot] = -1
		nextL[slot] = lruHead
		if lruHead >= 0 {
			prevL[lruHead] = slot
		}
		lruHead = slot
		if lruTail < 0 {
			lruTail = slot
		}
	}

	ms := t.Ms()
	c := common.NewChecksum()
	c.Add(hits)
	c.Add(misses)
	c.Add(sum)
	common.Report(ms, c.Hex())
}
