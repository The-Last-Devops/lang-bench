// string-build — nối chuỗi và định dạng số, việc mà code thật làm nhiều nhất (log,
// template, sinh HTML). Đổi số bằng tay, không gọi hàm định dạng của thư viện.
// string-build — appending and number formatting, the thing real code does most (logs,
// templates, HTML). Digits are produced by hand rather than by a library formatter.
program StringBuild;
{$mode objfpc}{$H+}{$Q-}{$R-}
uses Common;

var
  N, I, V, Len, Pos, Cap: LongInt;
  Buf: array[0..11] of Char;
  S: AnsiString;
  Sum: LongWord;
  T: TTimer;
  Ms: Double;
  C: TChecksum;
begin
  N := Param('n', 400000);
  T.Start;

  // Chuỗi cấp sẵn rồi ghi thẳng vào, đúng như bản C++ dùng reserve + push_back: nếu nối
  // bằng S := S + ... thì mỗi lần nối là một lần cấp phát và chép lại cả chuỗi, tức là đo
  // bộ cấp phát chứ không đo việc dựng chuỗi.
  // The string is reserved and written into, exactly as the C++ version does with reserve +
  // push_back: S := S + ... would reallocate and copy the whole string every time, measuring
  // the allocator instead of string building.
  Cap := N * 5;
  SetLength(S, Cap);
  Pos := 1;
  for I := 0 to N - 1 do
  begin
    // Sinh chữ số từ phải sang trái rồi đảo lại.
    // Digits are produced right to left, then reversed.
    V := I mod 1000;
    Len := 0;
    repeat
      Buf[Len] := Chr(Ord('0') + V mod 10);
      Inc(Len);
      V := V div 10;
    until V = 0;
    while Len > 0 do
    begin
      Dec(Len);
      S[Pos] := Buf[Len];
      Inc(Pos);
    end;
    S[Pos] := ',';
    Inc(Pos);
  end;
  SetLength(S, Pos - 1);

  // Cộng có trọng số theo vị trí: đổi chỗ hai ký tự là checksum đổi, khác với cộng thuần.
  // A position-weighted sum: swapping two characters changes it, unlike a plain sum.
  Sum := 0;
  for I := 1 to Length(S) do
    Sum := Sum + LongWord(I) * LongWord(Byte(S[I]));

  Ms := T.Ms;
  C.Init;
  C.Add(Sum);
  C.AddU64(QWord(Length(S)));
  Report(Ms, C.Hex);
end.
