// json — dựng 100k record, serialize ra chuỗi, parse lại, đọc số liệu.
// Dùng map[string]any (giá trị động), không dùng struct có tag — để so cho công bằng.
// json — build 100k records, serialize to a string, parse it back, read the fields.
// Uses map[string]any (dynamic), not tagged structs, to keep the comparison fair.
package main

import (
	"encoding/json"
	"strconv"

	"langbench/gocommon"
)

func main() {
	n := int(common.Param("n", 100000))

	t := common.NewTimer()
	docs := make([]any, 0, n)
	for i := 0; i < n; i++ {
		docs = append(docs, map[string]any{
			"id":     i,
			"name":   "user" + strconv.Itoa(i),
			"score":  (i * 37) % 1000,
			"active": i%3 == 0,
		})
	}
	text, err := json.Marshal(docs)
	if err != nil {
		panic(err)
	}
	var back []any
	if err := json.Unmarshal(text, &back); err != nil {
		panic(err)
	}

	var sumID, sumScore, active uint32
	for _, raw := range back {
		rec := raw.(map[string]any)
		sumID += uint32(int64(rec["id"].(float64)))
		sumScore += uint32(int64(rec["score"].(float64)))
		if rec["active"].(bool) {
			active++
		}
	}
	ms := t.Ms()

	c := common.NewChecksum()
	c.Add(sumID)
	c.Add(sumScore)
	c.Add(active)
	c.Add(uint32(len(text)))
	common.Report(ms, c.Hex())
}
