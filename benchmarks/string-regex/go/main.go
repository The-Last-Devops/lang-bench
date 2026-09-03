// string-regex — khớp regex trên 200k dòng log, dùng regexp (RE2) trong thư viện chuẩn.
// string-regex — match a regex over 200k log lines using stdlib regexp (RE2).
package main

import (
	"fmt"
	"regexp"
	"strconv"

	"langbench/gocommon"
)

const pattern = `^(\d+\.\d+\.\d+\.\d+) - \[([0-9-]+)\] "(GET|POST) (\S+) HTTP/1\.1" (\d{3}) (\d+)$`

func main() {
	n := int(common.Param("n", 200000))

	lines := make([]string, 0, n)
	rng := common.NewLcg(42)
	for i := 0; i < n; i++ {
		a := rng.Next() % 256
		b := rng.Next() % 256
		day := rng.Next()%28 + 1
		post := rng.Next()%4 == 0
		var status uint32 = 200
		if rng.Next()%10 >= 8 {
			if rng.Next()%2 == 1 {
				status = 404
			} else {
				status = 500
			}
		}
		bytes := rng.Next() % 100000
		method := "GET"
		if post {
			method = "POST"
		}
		lines = append(lines, fmt.Sprintf(
			"10.0.%d.%d - [2026-08-%02d] \"%s /path/%d HTTP/1.1\" %d %d",
			a, b, day, method, i, status, bytes))
	}

	t := common.NewTimer()
	re := regexp.MustCompile(pattern)
	var sumBytes, ok200, posts, matched uint32
	for _, line := range lines {
		m := re.FindStringSubmatch(line)
		if m != nil {
			matched++
			if m[3] == "POST" {
				posts++
			}
			status, _ := strconv.ParseUint(m[5], 10, 32)
			if status == 200 {
				ok200++
			}
			b, _ := strconv.ParseUint(m[6], 10, 32)
			sumBytes += uint32(b)
		}
	}
	ms := t.Ms()

	c := common.NewChecksum()
	c.Add(sumBytes)
	c.Add(ok200)
	c.Add(posts)
	c.Add(matched)
	common.Report(ms, c.Hex())
}
