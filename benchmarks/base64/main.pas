// base64 — mã hoá rồi giải mã một khối dữ liệu. Toàn thao tác dịch bit và tra bảng trên
// mảng byte: không gọi hàm base64 của thư viện, vì mọi ngôn ngữ phải chạy cùng một đoạn mã.
// base64 — encode a block of data, then decode it back. Pure bit-shifting and table lookups
// over byte arrays: no library base64, because every language must run the same code.
program Base64;
{$mode objfpc}{$H+}{$Q-}{$R-}
uses Common;

const
  ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  EQ = 61;  // '='

var
  Size, EncLen, I, O, D, Lim: LongInt;
  Src, Enc, Dec: array of Byte;
  Alpha: array[0..63] of Byte;
  Rev: array[0..255] of ShortInt;
  Rng: TLcg;
  V: LongWord;
  C0, C1, C2, C3: LongInt;
  EncSum, DecSum: LongWord;
  T: TTimer;
  Ms: Double;
  C: TChecksum;
begin
  Size := Param('size', 3000000);

  SetLength(Src, Size);
  Rng.Init(7);
  for I := 0 to Size - 1 do Src[I] := Byte(Rng.Next shr 24);

  for I := 0 to 63 do Alpha[I] := Byte(ALPHABET[I + 1]);
  for I := 0 to 255 do Rev[I] := -1;
  for I := 0 to 63 do Rev[Alpha[I]] := I;

  T.Start;

  EncLen := ((Size + 2) div 3) * 4;
  SetLength(Enc, EncLen);
  O := 0;
  I := 0;
  while I < Size do
  begin
    V := LongWord(Src[I]) shl 16;
    if I + 1 < Size then V := V or (LongWord(Src[I + 1]) shl 8);
    if I + 2 < Size then V := V or LongWord(Src[I + 2]);
    Enc[O] := Alpha[(V shr 18) and 63]; Inc(O);
    Enc[O] := Alpha[(V shr 12) and 63]; Inc(O);
    if I + 1 < Size then Enc[O] := Alpha[(V shr 6) and 63] else Enc[O] := EQ;
    Inc(O);
    if I + 2 < Size then Enc[O] := Alpha[V and 63] else Enc[O] := EQ;
    Inc(O);
    I := I + 3;
  end;

  SetLength(Dec, Size);
  D := 0;
  I := 0;
  while I < EncLen do
  begin
    C0 := Rev[Enc[I]];
    C1 := Rev[Enc[I + 1]];
    if Enc[I + 2] = EQ then C2 := -1 else C2 := Rev[Enc[I + 2]];
    if Enc[I + 3] = EQ then C3 := -1 else C3 := Rev[Enc[I + 3]];
    V := (LongWord(C0) shl 18) or (LongWord(C1) shl 12);
    if C2 >= 0 then V := V or (LongWord(C2) shl 6);
    if C3 >= 0 then V := V or LongWord(C3);
    if D < Size then begin Dec[D] := Byte((V shr 16) and $ff); Inc(D); end;
    if (C2 >= 0) and (D < Size) then begin Dec[D] := Byte((V shr 8) and $ff); Inc(D); end;
    if (C3 >= 0) and (D < Size) then begin Dec[D] := Byte(V and $ff); Inc(D); end;
    I := I + 4;
  end;

  // Cộng có trọng số vị trí, tràn vòng 32-bit: bắt được cả sai giá trị lẫn sai thứ tự.
  // Position-weighted sums with 32-bit wraparound: they catch wrong bytes and wrong order.
  EncSum := 0;
  DecSum := 0;
  for I := 0 to EncLen - 1 do EncSum := EncSum + LongWord(I + 1) * LongWord(Enc[I]);
  for I := 0 to D - 1 do DecSum := DecSum + LongWord(I + 1) * LongWord(Dec[I]);

  Ms := T.Ms;
  C.Init;
  C.Add(EncSum);
  C.Add(DecSum);
  C.AddU64(QWord(EncLen));
  Report(Ms, C.Hex);
end.
