// Package common chứa tiện ích dùng chung cho các bài test Go.
// Package common holds shared helpers for the Go benchmarks.
package common

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Timer đo phần việc thật, không tính khởi động tiến trình.
// Timer clocks the real work only, excluding process startup.
type Timer struct{ t0 time.Time }

func NewTimer() *Timer      { return &Timer{t0: time.Now()} }
func (t *Timer) Ms() float64 { return float64(time.Since(t.t0).Nanoseconds()) / 1e6 }

// Checksum 32-bit, phải khớp với cả 4 ngôn ngữ kia.
// 32-bit checksum, must match the other four languages.
type Checksum struct{ h uint32 }

func NewChecksum() *Checksum { return &Checksum{h: 2166136261} }

func (c *Checksum) Add(v uint32) {
	for i := 0; i < 4; i++ {
		c.h ^= (v >> (i * 8)) & 0xff
		c.h *= 16777619
	}
}

func (c *Checksum) AddU64(v uint64) {
	c.Add(uint32(v & 0xffffffff))
	c.Add(uint32(v >> 32))
}

func (c *Checksum) Value() uint32 { return c.h }
func (c *Checksum) Hex() string   { return fmt.Sprintf("%08x", c.h) }

// Lcg sinh số giả ngẫu nhiên xác định. / Lcg is a deterministic PRNG.
type Lcg struct{ s uint32 }

func NewLcg(seed uint32) *Lcg { return &Lcg{s: seed} }
func (l *Lcg) Next() uint32   { l.s = l.s*1664525 + 1013904223; return l.s }

// Param đọc tham số key=value. / Param reads a key=value argument.
func Param(key string, fallback int64) int64 {
	prefix := key + "="
	for _, a := range os.Args[1:] {
		if strings.HasPrefix(a, prefix) {
			if v, err := strconv.ParseInt(a[len(prefix):], 10, 64); err == nil {
				return v
			}
		}
	}
	return fallback
}

// Report in ra dòng duy nhất mà runner đọc.
// Report prints the single line the runner parses.
func Report(ms float64, checksum string) {
	fmt.Printf("{\"ms\": %.3f, \"checksum\": \"%s\"}\n", ms, checksum)
}
