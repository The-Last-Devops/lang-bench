// base64 — mã hoá rồi giải mã một khối dữ liệu. Toàn thao tác dịch bit và tra bảng trên
// mảng byte: không dùng encoding/base64, vì bốn ngôn ngữ phải chạy đúng cùng một đoạn mã
// thì so sánh mới có nghĩa. Xem main.cpp để biết chi tiết.
// base64 — encode a block of data, then decode it back. Pure bit-shifting and table
// lookups over byte arrays: encoding/base64 is deliberately not used, because the
// comparison only means something if all four languages run the same code. See main.cpp.
package main

import "langbench/gocommon"

const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

func main() {
	size := int(common.Param("size", 3000000))

	src := make([]byte, size)
	rng := common.NewLcg(7)
	for i := range src {
		src[i] = byte(rng.Next() >> 24)
	}

	var rev [256]int8
	for i := range rev {
		rev[i] = -1
	}
	for i := 0; i < 64; i++ {
		rev[alpha[i]] = int8(i)
	}

	t := common.NewTimer()

	encLen := (size + 2) / 3 * 4
	enc := make([]byte, encLen)
	o := 0
	for i := 0; i < size; i += 3 {
		v := uint32(src[i]) << 16
		if i+1 < size {
			v |= uint32(src[i+1]) << 8
		}
		if i+2 < size {
			v |= uint32(src[i+2])
		}
		enc[o] = alpha[(v>>18)&63]
		o++
		enc[o] = alpha[(v>>12)&63]
		o++
		if i+1 < size {
			enc[o] = alpha[(v>>6)&63]
		} else {
			enc[o] = '='
		}
		o++
		if i+2 < size {
			enc[o] = alpha[v&63]
		} else {
			enc[o] = '='
		}
		o++
	}

	dec := make([]byte, size)
	d := 0
	for i := 0; i < encLen; i += 4 {
		c0, c1 := int32(rev[enc[i]]), int32(rev[enc[i+1]])
		c2, c3 := int32(-1), int32(-1)
		if enc[i+2] != '=' {
			c2 = int32(rev[enc[i+2]])
		}
		if enc[i+3] != '=' {
			c3 = int32(rev[enc[i+3]])
		}
		v := uint32(c0)<<18 | uint32(c1)<<12
		if c2 >= 0 {
			v |= uint32(c2) << 6
		}
		if c3 >= 0 {
			v |= uint32(c3)
		}
		if d < size {
			dec[d] = byte(v >> 16)
			d++
		}
		if c2 >= 0 && d < size {
			dec[d] = byte(v >> 8)
			d++
		}
		if c3 >= 0 && d < size {
			dec[d] = byte(v)
			d++
		}
	}

	// Cộng có trọng số vị trí, tràn vòng 32-bit: bắt được cả sai giá trị lẫn sai thứ tự.
	// Position-weighted sums with 32-bit wraparound: they catch wrong bytes and wrong order alike.
	var encSum, decSum uint32
	for i, b := range enc {
		encSum += uint32(i+1) * uint32(b)
	}
	for i, b := range dec[:d] {
		decSum += uint32(i+1) * uint32(b)
	}

	ms := t.Ms()
	c := common.NewChecksum()
	c.Add(encSum)
	c.Add(decSum)
	c.AddU64(uint64(encLen))
	common.Report(ms, c.Hex())
}
