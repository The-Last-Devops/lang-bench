// string-build — nối chuỗi và định dạng số, việc mà code thật làm nhiều nhất (log,
// template, sinh HTML). Cách mỗi ngôn ngữ biểu diễn chuỗi lộ ra rõ nhất ở đây.
// string-build — appending and number formatting, the thing real code does most (logs,
// templates, HTML). How a language represents strings shows up most sharply here.
package main

import (
	"strconv"
	"strings"

	"langbench/gocommon"
)

func main() {
	n := common.Param("n", 400000)
	t := common.NewTimer()

	var b strings.Builder
	b.Grow(int(n) * 4)
	for i := int64(0); i < n; i++ {
		b.WriteString(strconv.FormatInt(i%1000, 10))
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
