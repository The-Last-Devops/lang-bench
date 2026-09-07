// crypto-hash — SHA-256 TỰ VIẾT trên 40 MB. Xem main.cpp để biết vì sao bỏ thư viện: gọi
// vào OpenSSL là gọi vào assembly viết tay, và phép so đảo chiều hoàn toàn.
// crypto-hash — a hand-written SHA-256 over 40 MB. See main.cpp for why the library went:
// calling OpenSSL means calling hand-written assembly, and the comparison reverses entirely.
program CryptoHash;
{$mode objfpc}{$H+}{$Q-}{$R-}
uses Common;

const
  K: array[0..63] of LongWord = (
    $428a2f98, $71374491, $b5c0fbcf, $e9b5dba5, $3956c25b, $59f111f1,
    $923f82a4, $ab1c5ed5, $d807aa98, $12835b01, $243185be, $550c7dc3,
    $72be5d74, $80deb1fe, $9bdc06a7, $c19bf174, $e49b69c1, $efbe4786,
    $0fc19dc6, $240ca1cc, $2de92c6f, $4a7484aa, $5cb0a9dc, $76f988da,
    $983e5152, $a831c66d, $b00327c8, $bf597fc7, $c6e00bf3, $d5a79147,
    $06ca6351, $14292967, $27b70a85, $2e1b2138, $4d2c6dfc, $53380d13,
    $650a7354, $766a0abb, $81c2c92e, $92722c85, $a2bfe8a1, $a81a664b,
    $c24b8b70, $c76c51a3, $d192e819, $d6990624, $f40e3585, $106aa070,
    $19a4c116, $1e376c08, $2748774c, $34b0bcb5, $391c0cb3, $4ed8aa4a,
    $5b9cca4f, $682e6ff3, $748f82ee, $78a5636f, $84c87814, $8cc70208,
    $90befffa, $a4506ceb, $bef9a3f7, $c67178f2);

var W: array[0..63] of LongWord;

function Rotr(X: LongWord; N: Integer): LongWord; inline;
begin
  Rotr := (X shr N) or (X shl (32 - N));
end;

procedure Block(var H: array of LongWord; const P: array of Byte; Base: LongInt);
var
  I: Integer;
  J: LongInt;
  X, Y, S0, S1, T1, T2, Ch, Maj, A, B, Cc, D, E, F, G, Hh: LongWord;
begin
  for I := 0 to 15 do
  begin
    J := Base + I * 4;
    W[I] := (LongWord(P[J]) shl 24) or (LongWord(P[J + 1]) shl 16)
         or (LongWord(P[J + 2]) shl 8) or LongWord(P[J + 3]);
  end;
  for I := 16 to 63 do
  begin
    X := W[I - 15];
    Y := W[I - 2];
    S0 := Rotr(X, 7) xor Rotr(X, 18) xor (X shr 3);
    S1 := Rotr(Y, 17) xor Rotr(Y, 19) xor (Y shr 10);
    W[I] := W[I - 16] + S0 + W[I - 7] + S1;
  end;
  A := H[0]; B := H[1]; Cc := H[2]; D := H[3];
  E := H[4]; F := H[5]; G := H[6]; Hh := H[7];
  for I := 0 to 63 do
  begin
    S1 := Rotr(E, 6) xor Rotr(E, 11) xor Rotr(E, 25);
    Ch := (E and F) xor ((not E) and G);
    T1 := Hh + S1 + Ch + K[I] + W[I];
    S0 := Rotr(A, 2) xor Rotr(A, 13) xor Rotr(A, 22);
    Maj := (A and B) xor (A and Cc) xor (B and Cc);
    T2 := S0 + Maj;
    Hh := G; G := F; F := E; E := D + T1;
    D := Cc; Cc := B; B := A; A := T1 + T2;
  end;
  H[0] := H[0] + A; H[1] := H[1] + B; H[2] := H[2] + Cc; H[3] := H[3] + D;
  H[4] := H[4] + E; H[5] := H[5] + F; H[6] := H[6] + G; H[7] := H[7] + Hh;
end;

var
  Iters, Chunk, I, Kk, Off: LongInt;
  Buf: array of Byte;
  Pad: array[0..63] of Byte;
  H: array[0..7] of LongWord;
  Bits: QWord;
  T: TTimer;
  Ms: Double;
  C: TChecksum;
begin
  Iters := Param('iters', 40);
  Chunk := 1 shl 20;

  SetLength(Buf, Chunk);
  for I := 0 to Chunk - 1 do Buf[I] := Byte((I * 31 + 7) and $ff);

  T.Start;

  H[0] := $6a09e667; H[1] := $bb67ae85; H[2] := $3c6ef372; H[3] := $a54ff53a;
  H[4] := $510e527f; H[5] := $9b05688c; H[6] := $1f83d9ab; H[7] := $5be0cd19;
  for Kk := 1 to Iters do
  begin
    Off := 0;
    while Off < Chunk do
    begin
      Block(H, Buf, Off);
      Off := Off + 64;
    end;
  end;

  // Tổng độ dài là bội của 64 nên phần đệm gọn trong đúng một khối.
  // The total length is a multiple of 64, so padding fits one exact block.
  FillChar(Pad, SizeOf(Pad), 0);
  Pad[0] := $80;
  Bits := QWord(Iters) * QWord(Chunk) * 8;
  for I := 0 to 7 do Pad[56 + I] := Byte((Bits shr (56 - I * 8)) and $ff);
  Block(H, Pad, 0);

  Ms := T.Ms;
  C.Init;
  C.Add(H[0]);
  C.Add(LongWord(Iters));
  Report(Ms, C.Hex);
end.
