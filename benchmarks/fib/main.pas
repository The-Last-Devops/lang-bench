// fib — đệ quy thuần, đo chi phí gọi hàm và stack.
// fib — plain recursion, measuring call and stack cost.
program Fib;
{$mode objfpc}{$H+}{$Q-}{$R-}
uses Common;

function Fibo(N: Integer): QWord;
begin
  if N < 2 then Fibo := QWord(N) else Fibo := Fibo(N - 1) + Fibo(N - 2);
end;

var
  N: Integer;
  T: TTimer;
  V: QWord;
  Ms: Double;
  C: TChecksum;
begin
  N := Param('n', 32);
  T.Start;
  V := Fibo(N);
  Ms := T.Ms;
  C.Init;
  C.Add(LongWord(V and $ffffffff));
  Report(Ms, C.Hex);
end.
