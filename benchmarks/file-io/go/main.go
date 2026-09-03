// file-io — ghi tuần tự rồi đọc lại 256 MB. Đo I/O đĩa, không đo CPU.
// file-io — write then read back 256 MB sequentially. This measures disk I/O, not CPU.
package main

import (
	"io"
	"os"
	"path/filepath"

	"langbench/gocommon"
)

func main() {
	mb := int(common.Param("mb", 256))
	const chunk = 1 << 20
	dir := os.Getenv("LB_TMPDIR")
	if dir == "" {
		dir = "/tmp"
	}
	path := filepath.Join(dir, "lang-bench-io-go.bin")

	// Buffer dựng MỘT LẦN, trước đồng hồ. / Buffer built ONCE, before the clock.
	buf := make([]byte, chunk)
	for j := 0; j < chunk; j++ {
		buf[j] = byte((j*31 + 7) & 0xff)
	}

	t := common.NewTimer()
	f, err := os.Create(path)
	if err != nil {
		panic(err)
	}
	for k := 0; k < mb; k++ {
		if _, err := f.Write(buf); err != nil {
			panic(err)
		}
	}
	if err := f.Sync(); err != nil {
		panic(err)
	}
	f.Close()

	// Chỉ cộng 4 KB đầu mỗi chunk để xác minh — xem ghi chú ở main.cpp.
	// Verify by summing only the first 4 KB of each chunk — see the note in main.cpp.
	const sample = 4096
	var sum uint32
	var totalRead uint64
	rf, err := os.Open(path)
	if err != nil {
		panic(err)
	}
	for k := 0; k < mb; k++ {
		got, err := io.ReadFull(rf, buf)
		if err != nil && got == 0 {
			break
		}
		totalRead += uint64(got)
		lim := got
		if lim > sample {
			lim = sample
		}
		for j := 0; j < lim; j++ {
			sum += uint32(buf[j])
		}
	}
	rf.Close()
	ms := t.Ms()
	os.Remove(path)

	c := common.NewChecksum()
	c.Add(sum)
	c.Add(uint32(totalRead >> 20))
	c.Add(uint32(mb))
	common.Report(ms, c.Hex())
}
