// utf8 — dựng một chuỗi nhiều ngôn ngữ rồi duyệt qua từng ký tự Unicode.
//
// Pascal giống C++ ở chỗ AnsiString chỉ là dãy byte, không có khái niệm Unicode nào — nên
// phần giải mã UTF-8 phải tự viết. Trọng số dùng thứ tự của ĐIỂM MÃ, không phải vị trí byte.
//
// utf8 — build a multilingual string, then walk it character by character.
//
// Pascal is like C++ here: an AnsiString is just bytes with no notion of Unicode, so the
// UTF-8 decoding is written by hand. The weight is the CODE POINT index, never a byte offset.
program Utf8Walk;
{$mode objfpc}{$H+}{$Q-}{$R-}
uses Common;

var
  N, I, Pos, Len: LongInt;
  Cps: array of LongWord;
  Rng: TLcg;
  R, Cp, Sum, Wide, Idx: LongWord;
  S: AnsiString;
  B0: Byte;
  T: TTimer;
  Ms: Double;
  C: TChecksum;
begin
  N := Param('n', 6000000);

  // Bốn dải: ASCII 1 byte, Latin 2 byte, CJK 3 byte, ký hiệu 4 byte.
  // Four ranges: ASCII at 1 byte, Latin at 2, CJK at 3, symbols at 4.
  SetLength(Cps, N);
  Rng.Init(2024);
  for I := 0 to N - 1 do
  begin
    R := Rng.Next;
    case R and 3 of
      0: Cps[I] := $20 + (R shr 8) mod 95;
      1: Cps[I] := $C0 + (R shr 8) mod 64;
      2: Cps[I] := $4E00 + (R shr 8) mod $5000;
    else
      Cps[I] := $1F300 + (R shr 8) mod $300;
    end;
  end;

  SetLength(S, N * 4);
  Pos := 1;
  for I := 0 to N - 1 do
  begin
    Cp := Cps[I];
    if Cp < $80 then
    begin
      S[Pos] := Chr(Cp); Inc(Pos);
    end
    else if Cp < $800 then
    begin
      S[Pos] := Chr($C0 or (Cp shr 6)); Inc(Pos);
      S[Pos] := Chr($80 or (Cp and $3F)); Inc(Pos);
    end
    else if Cp < $10000 then
    begin
      S[Pos] := Chr($E0 or (Cp shr 12)); Inc(Pos);
      S[Pos] := Chr($80 or ((Cp shr 6) and $3F)); Inc(Pos);
      S[Pos] := Chr($80 or (Cp and $3F)); Inc(Pos);
    end
    else
    begin
      S[Pos] := Chr($F0 or (Cp shr 18)); Inc(Pos);
      S[Pos] := Chr($80 or ((Cp shr 12) and $3F)); Inc(Pos);
      S[Pos] := Chr($80 or ((Cp shr 6) and $3F)); Inc(Pos);
      S[Pos] := Chr($80 or (Cp and $3F)); Inc(Pos);
    end;
  end;
  SetLength(S, Pos - 1);
  Len := Length(S);

  T.Start;

  Sum := 0; Wide := 0; Idx := 0;
  I := 1;
  while I <= Len do
  begin
    B0 := Byte(S[I]);
    if B0 < $80 then
    begin
      Cp := B0;
      Inc(I);
    end
    else if (B0 and $E0) = $C0 then
    begin
      Cp := (LongWord(B0 and $1F) shl 6) or (Byte(S[I + 1]) and $3F);
      I := I + 2;
    end
    else if (B0 and $F0) = $E0 then
    begin
      Cp := (LongWord(B0 and $0F) shl 12) or (LongWord(Byte(S[I + 1]) and $3F) shl 6)
         or (Byte(S[I + 2]) and $3F);
      I := I + 3;
    end
    else
    begin
      Cp := (LongWord(B0 and $07) shl 18) or (LongWord(Byte(S[I + 1]) and $3F) shl 12)
         or (LongWord(Byte(S[I + 2]) and $3F) shl 6) or (Byte(S[I + 3]) and $3F);
      I := I + 4;
    end;
    Inc(Idx);
    Sum := Sum + Idx * Cp;
    if Cp > $7F then Inc(Wide);
  end;

  Ms := T.Ms;
  C.Init;
  C.Add(Sum);
  C.Add(Wide);
  C.Add(Idx);
  C.AddU64(QWord(Len));
  Report(Ms, C.Hex);
end.
