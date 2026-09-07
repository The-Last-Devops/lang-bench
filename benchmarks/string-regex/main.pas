// string-regex — khớp regex trên 200k dòng log. Pascal dùng TRegExpr của FPC.
// Đây là bài CÒN LẠI cố ý dùng thư viện: nó so engine regex, không so ngôn ngữ.
// string-regex — match a regex over 200k log lines. Pascal uses FPC's TRegExpr.
// The OTHER benchmark that deliberately uses a library: it compares regex engines, not
// languages.
program StringRegex;
{$mode objfpc}{$H+}{$Q-}{$R-}
uses SysUtils, RegExpr, Common;

const
  PATTERN = '^(\d+\.\d+\.\d+\.\d+) - \[([0-9-]+)\] "(GET|POST) (\S+) HTTP/1\.1" (\d{3}) (\d+)$';

var
  N, I: LongInt;
  Lines: array of string;
  Rng: TLcg;
  A, B, Day, Status, Bytes: LongWord;
  Post: Boolean;
  Re: TRegExpr;
  SumBytes, Ok200, Posts, Matched: LongWord;
  T: TTimer;
  Ms: Double;
  C: TChecksum;
begin
  N := Param('n', 200000);

  // Sinh dữ liệu ngoài đồng hồ: chỉ đo phần regex.
  // Data generation stays outside the clock: we only measure the regex work.
  SetLength(Lines, N);
  Rng.Init(42);
  for I := 0 to N - 1 do
  begin
    A := Rng.Next mod 256;
    B := Rng.Next mod 256;
    Day := Rng.Next mod 28 + 1;
    Post := (Rng.Next mod 4) = 0;
    if (Rng.Next mod 10) < 8 then Status := 200
    else if (Rng.Next mod 2) = 1 then Status := 404
    else Status := 500;
    Bytes := Rng.Next mod 100000;
    Lines[I] := Format('10.0.%d.%d - [2026-08-%.2d] "%s /path/%d HTTP/1.1" %d %d',
      [A, B, Day, BoolToStr(Post, 'POST', 'GET'), I, Status, Bytes]);
  end;

  // Mẫu biên dịch một lần trước vòng lặp, giống PHP và Python.
  // The pattern is compiled once before the loop, as in PHP and Python.
  Re := TRegExpr.Create;
  Re.Expression := PATTERN;
  Re.Compile;

  T.Start;
  SumBytes := 0; Ok200 := 0; Posts := 0; Matched := 0;
  for I := 0 to N - 1 do
    if Re.Exec(Lines[I]) then
    begin
      Inc(Matched);
      if Re.Match[3] = 'POST' then Inc(Posts);
      if StrToInt(Re.Match[5]) = 200 then Inc(Ok200);
      SumBytes := SumBytes + LongWord(StrToInt(Re.Match[6]));
    end;
  Ms := T.Ms;

  C.Init;
  C.Add(SumBytes);
  C.Add(Ok200);
  C.Add(Posts);
  C.Add(Matched);
  Report(Ms, C.Hex);
end.
