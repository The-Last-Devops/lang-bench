// crypto-hash — SHA-256 TỰ VIẾT trên 40 MB. Xem main.cpp để biết vì sao bỏ OpenSSL/sha2.
// crypto-hash — a hand-written SHA-256 over 40 MB. See main.cpp for why OpenSSL/sha2 went.
package main

import "langbench/gocommon"

var kTab = [64]uint32{
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
	0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
	0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
	0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
	0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
	0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
	0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
	0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
	0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
}

func rotr(x uint32, n uint) uint32 { return (x >> n) | (x << (32 - n)) }

func block(h *[8]uint32, p []byte) {
	var w [64]uint32
	for i := 0; i < 16; i++ {
		w[i] = uint32(p[i*4])<<24 | uint32(p[i*4+1])<<16 | uint32(p[i*4+2])<<8 | uint32(p[i*4+3])
	}
	for i := 16; i < 64; i++ {
		s0 := rotr(w[i-15], 7) ^ rotr(w[i-15], 18) ^ (w[i-15] >> 3)
		s1 := rotr(w[i-2], 17) ^ rotr(w[i-2], 19) ^ (w[i-2] >> 10)
		w[i] = w[i-16] + s0 + w[i-7] + s1
	}
	a, b, c, d, e, f, g, hh := h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7]
	for i := 0; i < 64; i++ {
		s1 := rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
		ch := (e & f) ^ (^e & g)
		t1 := hh + s1 + ch + kTab[i] + w[i]
		s0 := rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
		maj := (a & b) ^ (a & c) ^ (b & c)
		t2 := s0 + maj
		hh, g, f, e, d, c, b, a = g, f, e, d+t1, c, b, a, t1+t2
	}
	h[0] += a; h[1] += b; h[2] += c; h[3] += d
	h[4] += e; h[5] += f; h[6] += g; h[7] += hh
}

func main() {
	iters := int(common.Param("iters", 40))
	chunk := 1 << 20

	buf := make([]byte, chunk)
	for i := range buf {
		buf[i] = byte((i*31 + 7) & 0xff)
	}

	t := common.NewTimer()

	h := [8]uint32{
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
		0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
	}
	for k := 0; k < iters; k++ {
		for off := 0; off < chunk; off += 64 {
			block(&h, buf[off:off+64])
		}
	}

	// Tổng độ dài là bội của 64 nên phần đệm gọn trong đúng một khối.
	// The total length is a multiple of 64, so padding fits one exact block.
	var pad [64]byte
	pad[0] = 0x80
	bits := uint64(iters) * uint64(chunk) * 8
	for i := 0; i < 8; i++ {
		pad[56+i] = byte(bits >> (56 - i*8))
	}
	block(&h, pad[:])

	ms := t.Ms()
	c := common.NewChecksum()
	c.Add(h[0])
	c.Add(uint32(iters))
	common.Report(ms, c.Hex())
}
