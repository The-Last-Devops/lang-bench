// virtual-call — gọi qua interface trên mảng trộn lẫn bốn kiểu. Xem main.cpp để biết vì sao.
// virtual-call — dispatch through an interface over an array of four mixed kinds. See main.cpp.
package main

import "langbench/gocommon"

type shape interface {
	area() uint32
}

type square struct{ a uint32 }
type rect struct{ a, b uint32 }
type tri struct{ a, b uint32 }
type line struct{ a uint32 }

func (s square) area() uint32 { return s.a * s.a }
func (s rect) area() uint32   { return s.a * s.b }
func (s tri) area() uint32    { return s.a * s.b / 2 }
func (s line) area() uint32   { return s.a }

func main() {
	n := int(common.Param("n", 1000000))
	passes := int(common.Param("passes", 20))

	rng := common.NewLcg(5)
	v := make([]shape, n)
	for i := 0; i < n; i++ {
		kind := rng.Next() % 4
		a := rng.Next() % 1000
		b := rng.Next() % 1000
		switch kind {
		case 0:
			v[i] = square{a}
		case 1:
			v[i] = rect{a, b}
		case 2:
			v[i] = tri{a, b}
		default:
			v[i] = line{a}
		}
	}

	t := common.NewTimer()
	var sum uint32
	for p := 0; p < passes; p++ {
		for _, s := range v {
			sum += s.area()
		}
	}
	ms := t.Ms()

	c := common.NewChecksum()
	c.Add(sum)
	c.Add(uint32(passes))
	common.Report(ms, c.Hex())
}
