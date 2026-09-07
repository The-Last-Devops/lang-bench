// sort — merge sort đáy-lên TỰ VIẾT trên mảng số nguyên 32-bit. Xem main.cpp để biết vì
// sao bỏ sort của thư viện chuẩn.
// sort — a hand-written bottom-up merge sort over 32-bit integers. See main.cpp for why the
// standard library's sort was dropped.
program Sort;
{$mode objfpc}{$H+}{$Q-}{$R-}
uses Common;

type PLW = ^LongWord;

var
  N: LongInt;
  V, Buf: array of LongWord;
  A, B, Tmp: PLW;
  Rng: TLcg;
  Width, Lo, Mid, Hi, I, J, K: LongInt;
  T: TTimer;
  Ms: Double;
  Sum: LongWord;
  C: TChecksum;
begin
  N := Param('n', 3000000);
  SetLength(V, N);
  SetLength(Buf, N);
  Rng.Init(42);
  for I := 0 to N - 1 do V[I] := Rng.Next;

  T.Start;

  // Trộn từng cặp đoạn dài `Width`, tăng gấp đôi mỗi vòng, đổi vai hai mảng sau mỗi vòng
  // để không phải chép ngược lại.
  // Merge pairs of runs of length `Width`, doubling each pass, swapping the two arrays'
  // roles after each pass so nothing has to be copied back.
  A := @V[0];
  B := @Buf[0];
  Width := 1;
  while Width < N do
  begin
    Lo := 0;
    while Lo < N do
    begin
      Mid := Lo + Width; if Mid > N then Mid := N;
      Hi := Lo + Width * 2; if Hi > N then Hi := N;
      I := Lo; J := Mid; K := Lo;
      while (I < Mid) and (J < Hi) do
      begin
        if A[I] <= A[J] then begin B[K] := A[I]; Inc(I); end
        else begin B[K] := A[J]; Inc(J); end;
        Inc(K);
      end;
      while I < Mid do begin B[K] := A[I]; Inc(I); Inc(K); end;
      while J < Hi do begin B[K] := A[J]; Inc(J); Inc(K); end;
      Lo := Lo + Width * 2;
    end;
    Tmp := A; A := B; B := Tmp;
    Width := Width * 2;
  end;
  // Kết quả phải nằm ở mảng gốc thì phần checksum bên dưới mới đọc đúng.
  // The result has to end up in the original array for the checksum below to read it.
  if A <> @V[0] then Move(A^, V[0], N * SizeOf(LongWord));

  Ms := T.Ms;

  Sum := 0;
  I := 0;
  while I < N do begin Sum := Sum + V[I]; I := I + 1000; end;
  C.Init;
  C.Add(V[0]);
  C.Add(V[N - 1]);
  C.Add(Sum);
  Report(Ms, C.Hex);
end.
