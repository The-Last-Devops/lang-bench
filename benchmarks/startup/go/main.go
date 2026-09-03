// startup — in một dòng rồi thoát. Không dùng helper chung, xem ghi chú ở main.cpp.
// startup — print one line and exit. No shared helpers; see the note in main.cpp.
package main

import "os"

func main() {
	os.Stdout.WriteString("{\"ms\": 0.000, \"checksum\": \"00000001\"}\n")
}
