// alloc-gc — cấp rồi thả hàng triệu object nhỏ. Pascal không có GC, nên phần thu hồi là
// New/Dispose thủ công, đúng như bản C++ — và đó chính là thứ bài này so.
// alloc-gc — allocate and drop millions of small objects. Pascal has no GC, so reclamation
// is manual New/Dispose exactly as in the C++ version — which is what this compares.
program AllocGc;
{$mode objfpc}{$H+}{$Q-}{$R-}
uses Common;

type
  PNode = ^TNode;
  TNode = record
    Value: LongWord;
    Next: PNode;
  end;

var
  Batches, Per, B, I: LongInt;
  Rng: TLcg;
  Head, Node, Nxt: PNode;
  Total: LongWord;
  T: TTimer;
  Ms: Double;
  C: TChecksum;
begin
  Batches := Param('batches', 400);
  Per := Param('per', 5000);
  Rng.Init(42);

  T.Start;
  Total := 0;
  for B := 1 to Batches do
  begin
    Head := nil;
    for I := 1 to Per do
    begin
      New(Node);
      Node^.Value := Rng.Next;
      Node^.Next := Head;
      Head := Node;
    end;
    Node := Head;
    while Node <> nil do
    begin
      Total := Total + Node^.Value;
      Node := Node^.Next;
    end;
    // Thả theo vòng lặp, tránh đệ quy sâu. / Freed iteratively, avoiding deep recursion.
    while Head <> nil do
    begin
      Nxt := Head^.Next;
      Dispose(Head);
      Head := Nxt;
    end;
  end;
  Ms := T.Ms;

  C.Init;
  C.Add(Total);
  C.Add(LongWord(Batches * Per));
  Report(Ms, C.Hex);
end.
