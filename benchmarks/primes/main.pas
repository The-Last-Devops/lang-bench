// primes — sàng Eratosthenes, đo vòng lặp chặt và truy cập mảng lớn.
// primes — sieve of Eratosthenes, measuring tight loops over a large array.
program Primes;
{$mode objfpc}{$H+}{$Q-}{$R-}
uses Common;

var
  N, I, J: Int64;
  Composite: array of Byte;
  Count, Sum: LongWord;
  T: TTimer;
  Ms: Double;
  C: TChecksum;
begin
  N := Param('n', 10000000);
  T.Start;
  SetLength(Composite, N + 1);
  FillChar(Composite[0], N + 1, 0);
  I := 2;
  while I * I <= N do
  begin
    if Composite[I] = 0 then
    begin
      J := I * I;
      while J <= N do
      begin
        Composite[J] := 1;
        J := J + I;
      end;
    end;
    Inc(I);
  end;

  Count := 0;
  Sum := 0;
  for I := 2 to N do
    if Composite[I] = 0 then
    begin
      Inc(Count);
      Sum := Sum + LongWord(I);
    end;
  Ms := T.Ms;

  C.Init;
  C.Add(Count);
  C.Add(Sum);
  Report(Ms, C.Hex);
end.
