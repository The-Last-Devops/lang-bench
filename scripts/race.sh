#!/usr/bin/env bash
# Mở màn hình đua trong một cửa sổ Chrome riêng, đã tắt chính sách chặn autoplay —
# nhờ vậy có tiếng ngay cả khi F5 giữa lượt chạy, không cần bấm vào đâu trước.
# Trang web KHÔNG thể tự làm việc này: chặn autoplay là quyết định của trình duyệt,
# chỉ gỡ được từ phía trình duyệt.
#
# Opens the race screen in its own Chrome window with the autoplay policy disabled,
# so sound works even after reloading mid-run, with no click needed first. A page
# cannot do this for itself: the autoplay block is the browser's call to make, and
# can only be lifted from the browser side.
#
# Hồ sơ riêng, tách khỏi Chrome thường ngày — không đụng vào tab, cookie hay cài đặt.
# A separate profile, kept away from everyday Chrome — no tabs, cookies or settings touched.
set -euo pipefail

URL="${1:-http://localhost:8090/race.html}"
PROFILE="${TMPDIR:-/tmp}/lang-bench-chrome"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if [ ! -x "$CHROME" ]; then
  echo "không tìm thấy Google Chrome / Google Chrome not found at:" >&2
  echo "  $CHROME" >&2
  exit 1
fi

mkdir -p "$PROFILE"
exec "$CHROME" \
  --user-data-dir="$PROFILE" \
  --autoplay-policy=no-user-gesture-required \
  --new-window "$URL"
