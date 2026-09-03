# startup — in một dòng rồi thoát. Không import helper chung: bài này đo đúng
# chi phí khởi động, mọi import thêm đều làm sai số liệu.
# startup — print one line and exit. No shared helper import: this measures startup
# cost itself, and any extra import would distort it.
import sys

sys.stdout.write('{"ms": 0.000, "checksum": "00000001"}\n')
