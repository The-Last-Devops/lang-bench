// hashmap — bảng băm địa chỉ mở TỰ VIẾT, khoá chuỗi. Xem main.cpp để biết vì sao không
// dùng bảng băm của thư viện.
// hashmap — a hand-written open-addressing hash table with string keys. See main.cpp for
// why no library hash map is used.
program HashMap;
{$mode objfpc}{$H+}{$Q-}{$R-}
uses SysUtils, Common;

function HashKey(const S: string): LongWord; inline;
var I: LongInt; H: LongWord;
begin
  H := 2166136261;
  for I := 1 to Length(S) do
  begin
    H := H xor LongWord(Byte(S[I]));
    H := H * 16777619;
  end;
  HashKey := H;
end;

var
  N, Cap, I: LongInt;
  Keys, Absent: array of string;
  TKeys: array of string;
  TVals: array of LongWord;
  TUsed: array of Byte;
  Mask, Slot, Sum, Hits, Misses: LongWord;
  T: TTimer;
  Ms: Double;
  C: TChecksum;

// Ô trống nhận biết qua mảng cờ riêng: chuỗi rỗng cũng là một khoá hợp lệ về mặt kiểu, nên
// không thể lấy nó làm dấu "trống". Bảng không bao giờ xoá, nên dò dừng ở ô trống đầu tiên.
// A separate flag array marks empty slots: an empty string is still a valid key as far as
// the type is concerned. The table never deletes, so probing stops at the first empty slot.
procedure Put(const K: string; V: LongWord);
var Idx: LongWord;
begin
  Idx := HashKey(K) and Mask;
  while TUsed[Idx] <> 0 do
  begin
    if TKeys[Idx] = K then begin TVals[Idx] := V; Exit; end;
    Idx := (Idx + 1) and Mask;
  end;
  TUsed[Idx] := 1;
  TKeys[Idx] := K;
  TVals[Idx] := V;
end;

// Trả về True kèm giá trị, hoặc False khi không có khoá.
// Returns True with the value, or False when the key is absent.
function Get(const K: string; out V: LongWord): Boolean;
var Idx: LongWord;
begin
  Idx := HashKey(K) and Mask;
  while TUsed[Idx] <> 0 do
  begin
    if TKeys[Idx] = K then begin V := TVals[Idx]; Exit(True); end;
    Idx := (Idx + 1) and Mask;
  end;
  Get := False;
end;

var Got: LongWord;
begin
  N := Param('n', 1000000);

  // Chuỗi khoá dựng NGOÀI đồng hồ: phần đo là việc của bảng băm, không phải việc đổi số
  // sang chuỗi. / Key strings built OUTSIDE the clock: the measurement is the table's work,
  // not integer-to-string conversion.
  SetLength(Keys, N);
  SetLength(Absent, N div 2);
  for I := 0 to N - 1 do Keys[I] := 'key' + IntToStr(I);
  for I := 0 to (N div 2) - 1 do Absent[I] := 'nokey' + IntToStr(I);

  Cap := 1;
  while Cap < N * 2 do Cap := Cap * 2;
  Mask := LongWord(Cap - 1);

  T.Start;

  SetLength(TKeys, Cap);
  SetLength(TVals, Cap);
  SetLength(TUsed, Cap);

  for I := 0 to N - 1 do Put(Keys[I], LongWord(I) * 7);

  Sum := 0; Hits := 0; Misses := 0;
  for I := 0 to N - 1 do
    if Get(Keys[I], Got) then
    begin
      Inc(Hits);
      Sum := Sum + Got;
    end;
  for I := 0 to (N div 2) - 1 do
    if not Get(Absent[I], Got) then Inc(Misses);

  Ms := T.Ms;
  C.Init;
  C.Add(Sum);
  C.Add(Hits);
  C.Add(Misses);
  Report(Ms, C.Hex);
end.
