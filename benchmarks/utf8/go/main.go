// utf8 — dựng một chuỗi nhiều ngôn ngữ rồi duyệt qua từng ký tự Unicode.
// Xem main.cpp để biết vì sao bài này đo được thứ mà bài chuỗi khác không đo.
// utf8 — build a multilingual string, then walk it character by character.
// See main.cpp for what this measures that the other string benchmarks cannot.
package main

import "langbench/gocommon"

func main() {
	n := int(common.Param("n", 6000000))

	// Bốn dải: ASCII 1 byte, Latin 2 byte, CJK 3 byte, ký hiệu 4 byte.
	// Four ranges: ASCII at 1 byte, Latin at 2, CJK at 3, symbols at 4.
	rng := common.NewLcg(2024)
	cps := make([]rune, n)
	for i := range cps {
		r := rng.Next()
		switch r & 3 {
		case 0:
			cps[i] = rune(0x20 + (r>>8)%95)
		case 1:
			cps[i] = rune(0xC0 + (r>>8)%64)
		case 2:
			cps[i] = rune(0x4E00 + (r>>8)%0x5000)
		default:
			cps[i] = rune(0x1F300 + (r>>8)%0x300)
		}
	}
	// string(cps) mã hoá sang UTF-8 — chuỗi của Go vốn là byte, rune chỉ xuất hiện khi duyệt.
	// string(cps) encodes to UTF-8: a Go string is bytes, and runes appear only when ranging.
	s := string(cps)

	t := common.NewTimer()

	// `for range` trên string giải mã UTF-8 và trả về rune, không phải byte.
	// `for range` over a string decodes UTF-8 and yields runes rather than bytes.
	var sum, wide, idx uint32
	for _, ch := range s {
		cp := uint32(ch)
		idx++
		sum += idx * cp
		if cp > 0x7F {
			wide++
		}
	}

	ms := t.Ms()
	c := common.NewChecksum()
	c.Add(sum)
	c.Add(wide)
	c.Add(idx)
	c.AddU64(uint64(len(s)))
	common.Report(ms, c.Hex())
}
