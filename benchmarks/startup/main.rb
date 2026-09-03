# startup — in một dòng rồi thoát. Không require helper chung: bài này đo đúng
# chi phí khởi động, mọi require thêm đều làm sai số liệu.
# startup — print one line and exit. No shared require: this measures startup cost
# itself, and any extra require would distort it.
$stdout.write("{\"ms\": 0.000, \"checksum\": \"00000001\"}\n")
