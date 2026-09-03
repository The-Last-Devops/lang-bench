// crypto-hash — SHA-256 trên 200 MB, dùng crypto/sha256 trong thư viện chuẩn (có asm arm64).
// crypto-hash — SHA-256 over 200 MB using stdlib crypto/sha256 (with arm64 asm).
package main

import (
	"crypto/sha256"

	"langbench/gocommon"
)

func main() {
	iters := int(common.Param("iters", 200))
	const chunk = 1 << 20

	buf := make([]byte, chunk)
	for i := 0; i < chunk; i++ {
		buf[i] = byte((i*31 + 7) & 0xff)
	}

	t := common.NewTimer()
	h := sha256.New()
	for k := 0; k < iters; k++ {
		h.Write(buf)
	}
	digest := h.Sum(nil)
	ms := t.Ms()

	head := uint32(digest[0])<<24 | uint32(digest[1])<<16 | uint32(digest[2])<<8 | uint32(digest[3])
	c := common.NewChecksum()
	c.Add(head)
	c.Add(uint32(iters))
	common.Report(ms, c.Hex())
}
