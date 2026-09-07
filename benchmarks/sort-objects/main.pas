// sort-objects — merge sort đáy-lên TỰ VIẾT trên mảng bản ghi, so theo cặp (key, id).
// Xem main.cpp để biết vì sao khoá phải là một cặp.
// sort-objects — a hand-written bottom-up merge sort over records, keyed on (key, id).
// See main.cpp for why the key has to be a pair.
program SortObjects;
{$mode objfpc}{$H+}{$Q-}{$R-}
uses Common;

type
  TRec = record
    Key: LongWord;
    Id: LongWord;
  end;
  PRec = ^TRec;

function Before(const X, Y: TRec): Boolean; inline;
begin
  if X.Key <> Y.Key then Before := X.Key < Y.Key else Before := X.Id < Y.Id;
end;

var
  N: LongInt;
  V, Buf: array of TRec;
  A, B, Tmp: PRec;
  Rng: TLcg;
  Width, Lo, Mid, Hi, I, J, K: LongInt;
  T: TTimer;
  Ms: Double;
  Sum: LongWord;
  C: TChecksum;
begin
  N := Param('n', 400000);
  SetLength(V, N);
  SetLength(Buf, N);
  Rng.Init(99);
  for I := 0 to N - 1 do
  begin
    V[I].Key := Rng.Next;
    V[I].Id := LongWord(I);
  end;

  T.Start;

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
        if Before(A[J], A[I]) then begin B[K] := A[J]; Inc(J); end
        else begin B[K] := A[I]; Inc(I); end;
        Inc(K);
      end;
      while I < Mid do begin B[K] := A[I]; Inc(I); Inc(K); end;
      while J < Hi do begin B[K] := A[J]; Inc(J); Inc(K); end;
      Lo := Lo + Width * 2;
    end;
    Tmp := A; A := B; B := Tmp;
    Width := Width * 2;
  end;
  if A <> @V[0] then Move(A^, V[0], N * SizeOf(TRec));

  Sum := 0;
  for I := 0 to N - 1 do
    Sum := Sum + LongWord(I + 1) * (V[I].Key xor V[I].Id);
  Ms := T.Ms;

  C.Init;
  C.Add(Sum);
  C.Add(V[0].Key);
  C.Add(V[N - 1].Key);
  Report(Ms, C.Hex);
end.
