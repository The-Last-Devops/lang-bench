// binary-trees — dựng rồi huỷ hàng loạt cây nhị phân. Đo chi phí cấp phát và thu hồi bộ
// nhớ theo cụm nhỏ, ngắn hạn.
// binary-trees — build and tear down many binary trees, measuring the cost of small,
// short-lived allocations in bulk.
program BinaryTrees;
{$mode objfpc}{$H+}{$Q-}{$R-}
uses Common;

type
  PNode = ^TNode;
  TNode = record
    L, R: PNode;
  end;

// Cây cấp phát trên heap từng nút một — mục đích của bài test chính là chi phí đó.
// Nodes are heap-allocated one at a time: that cost is the point of the benchmark.
function Build(Depth: Integer): PNode;
var N: PNode;
begin
  New(N);
  N^.L := nil;
  N^.R := nil;
  if Depth > 0 then
  begin
    N^.L := Build(Depth - 1);
    N^.R := Build(Depth - 1);
  end;
  Build := N;
end;

function Check(N: PNode): QWord;
begin
  if N^.L = nil then Check := 1
  else Check := 1 + Check(N^.L) + Check(N^.R);
end;

procedure Drop(N: PNode);
begin
  if N^.L <> nil then
  begin
    Drop(N^.L);
    Drop(N^.R);
  end;
  Dispose(N);
end;

var
  MaxDepth, D, I, Iters: Integer;
  Total: QWord;
  Tree: PNode;
  T: TTimer;
  Ms: Double;
  C: TChecksum;
begin
  MaxDepth := Param('depth', 16);
  T.Start;

  Total := 0;
  D := 4;
  while D <= MaxDepth do
  begin
    // Cây càng nông thì dựng càng nhiều, để mỗi vòng làm lượng việc tương đương.
    // Shallower trees are built more often, so every round does comparable work.
    Iters := 1 shl (MaxDepth - D + 4);
    for I := 1 to Iters do
    begin
      Tree := Build(D);
      Total := Total + Check(Tree);
      Drop(Tree);
    end;
    D := D + 2;
  end;

  Ms := T.Ms;
  C.Init;
  C.AddU64(Total);
  Report(Ms, C.Hex);
end.
