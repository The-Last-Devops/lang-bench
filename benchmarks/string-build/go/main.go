// string-build — nối chuỗi và định dạng số, việc mà code thật làm nhiều nhất (log,
// template, sinh HTML). Cách mỗi ngôn ngữ biểu diễn chuỗi lộ ra rõ nhất ở đây.
// string-build — appending and number formatting, the thing real code does most (logs,
// templates, HTML). How a language represents strings shows up most sharply here.
package main

import (
	"strings"

	"langbench/gocommon"
)

func main() {
	n := common.Param("n", 400000)
	t := common.NewTimer()

	var b strings.Builder
	b.Grow(int(n) * 4)
	// Chuyển số bằng tay, không dùng strconv — xem main.cpp để biết vì sao.
	// Hand-rolled conversion instead of strconv — see main.cpp for why.
	var buf [12]byte
	for i := int64(0); i < n; i++ {
		v := i % 1000
		length := 0
		for {
			buf[length] = byte('0' + v%10)
			length++
			v /= 10
			if v == 0 {
				break
			}
		}
		for length > 0 {
			length--
			b.WriteByte(buf[length])
		}
		b.WriteByte(',')
	}
	s := b.String()

	// Cộng có trọng số theo vị trí: đổi chỗ hai ký tự là checksum đổi, khác với cộng thuần.
	// A position-weighted sum: swapping two characters changes it, unlike a plain sum.
	var sum uint32
	for i := 0; i < len(s); i++ {
		sum += uint32(i+1) * uint32(s[i])
	}

	ms := t.Ms()
	c := common.NewChecksum()
	c.Add(sum)
	c.AddU64(uint64(len(s)))
	common.Report(ms, c.Hex())
}
