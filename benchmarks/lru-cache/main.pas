// lru-cache — cache LRU TỰ VIẾT: bảng băm dây xích cộng danh sách liên kết đôi trên mảng
// phẳng. Không dùng cấu trúc có sẵn nào của thư viện — xem main.cpp.
// lru-cache — a hand-written LRU cache: a chained hash table plus a doubly linked list over
// flat arrays. No library container is used — see main.cpp.
program LruCache;
{$mode objfpc}{$H+}{$Q-}{$R-}
uses Common;

var
  Cap, Ops, Buckets, I: LongInt;
  Space, Mask, K, B, Hits, Misses, Sum: LongWord;
  Keys: array of LongWord;
  Rng: TLcg;
  Head, Next, PrevL, NextL: array of LongInt;
  Key, Val: array of LongWord;
  LruHead, LruTail, Used, Node, Slot, P, Nx, Cur, Prev: LongInt;
  Ob: LongWord;
  T: TTimer;
  Ms: Double;
  C: TChecksum;
begin
  Cap := Param('cap', 100000);
  Ops := Param('ops', 2000000);
  Space := LongWord(Cap * 3);

  // Dãy khoá sinh trước, ngoài đồng hồ, nên mọi ngôn ngữ chạy đúng cùng chuỗi thao tác.
  // The key sequence is generated up front, outside the clock, so every language performs
  // exactly the same operations.
  SetLength(Keys, Ops);
  Rng.Init(31);
  for I := 0 to Ops - 1 do Keys[I] := Rng.Next mod Space;

  Buckets := 1;
  while Buckets < Cap * 2 do Buckets := Buckets * 2;
  Mask := LongWord(Buckets - 1);

  SetLength(Head, Buckets);
  SetLength(Next, Cap);
  SetLength(Key, Cap);
  SetLength(Val, Cap);
  SetLength(PrevL, Cap);
  SetLength(NextL, Cap);
  for I := 0 to Buckets - 1 do Head[I] := -1;
  for I := 0 to Cap - 1 do
  begin
    Next[I] := -1;
    PrevL[I] := -1;
    NextL[I] := -1;
  end;
  LruHead := -1; LruTail := -1; Used := 0;

  T.Start;

  Hits := 0; Misses := 0; Sum := 0;

  for I := 0 to Ops - 1 do
  begin
    K := Keys[I];
    B := (K * 2654435761) and Mask;

    Node := Head[B];
    while (Node >= 0) and (Key[Node] <> K) do Node := Next[Node];

    if Node >= 0 then
    begin
      Inc(Hits);
      Sum := Sum + Val[Node];
      // Đưa lên đầu: tháo khỏi vị trí cũ rồi nối vào đầu.
      // Move to the head: unlink from where it sits, then link it in at the front.
      if LruHead <> Node then
      begin
        P := PrevL[Node]; Nx := NextL[Node];
        if P >= 0 then NextL[P] := Nx;
        if Nx >= 0 then PrevL[Nx] := P;
        if LruTail = Node then LruTail := P;
        PrevL[Node] := -1;
        NextL[Node] := LruHead;
        if LruHead >= 0 then PrevL[LruHead] := Node;
        LruHead := Node;
      end;
      Continue;
    end;

    Inc(Misses);
    if Used < Cap then
    begin
      Slot := Used;
      Inc(Used);
    end
    else
    begin
      // Đầy thì loại node ở cuối danh sách: gỡ khỏi dây xích của rổ cũ trước.
      // When full, evict the list's tail: unhook it from its old bucket chain first.
      Slot := LruTail;
      Ob := (Key[Slot] * 2654435761) and Mask;
      Cur := Head[Ob]; Prev := -1;
      while (Cur >= 0) and (Cur <> Slot) do begin Prev := Cur; Cur := Next[Cur]; end;
      if Prev >= 0 then Next[Prev] := Next[Slot] else Head[Ob] := Next[Slot];

      P := PrevL[Slot];
      if P >= 0 then NextL[P] := -1;
      LruTail := P;
      if LruHead = Slot then LruHead := -1;
    end;

    Key[Slot] := K;
    Val[Slot] := K * 2 + 1;
    Next[Slot] := Head[B];
    Head[B] := Slot;

    PrevL[Slot] := -1;
    NextL[Slot] := LruHead;
    if LruHead >= 0 then PrevL[LruHead] := Slot;
    LruHead := Slot;
    if LruTail < 0 then LruTail := Slot;
  end;

  Ms := T.Ms;
  C.Init;
  C.Add(Hits);
  C.Add(Misses);
  C.Add(Sum);
  Report(Ms, C.Hex);
end.
