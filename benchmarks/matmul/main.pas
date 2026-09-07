// matmul — nhân ma trận N×N kiểu ngây thơ trên số nguyên 64-bit, đo thông lượng vòng lặp
// chặt và hành vi cache. Xem ghi chú trong main.cpp về lý do bỏ f64.
// matmul — naive N×N matrix multiply over 64-bit integers, measuring tight-loop throughput
// and cache behaviour. See main.cpp for why f64 was dropped.
program MatMul;
{$mode objfpc}{$H+}{$Q-}{$R-}
uses Common;

var
  N, I, J, K: Integer;
  A, B, C: array of Int64;
  Aik: Int64;
  Sum: QWord;
  T: TTimer;
  Ms: Double;
  Ck: TChecksum;
begin
  N := Param('n', 256);
  SetLength(A, N * N);
  SetLength(B, N * N);
  SetLength(C, N * N);
  for I := 0 to N - 1 do
    for J := 0 to N - 1 do
    begin
      A[I * N + J] := (I * 31 + J * 17) mod 100;
      B[I * N + J] := (I * 13 + J * 7) mod 100;
      C[I * N + J] := 0;
    end;

  T.Start;
  for I := 0 to N - 1 do
    for K := 0 to N - 1 do
    begin
      Aik := A[I * N + K];
      for J := 0 to N - 1 do
        C[I * N + J] := C[I * N + J] + Aik * B[K * N + J];
    end;
  Sum := 0;
  for I := 0 to N * N - 1 do Sum := Sum + QWord(C[I]);
  Ms := T.Ms;

  Ck.Init;
  Ck.AddU64(Sum);
  Report(Ms, Ck.Hex);
end.
