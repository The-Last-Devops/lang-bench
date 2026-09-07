// dijkstra — đường đi ngắn nhất trên đồ thị thưa sinh sẵn, dùng heap nhị phân TỰ VIẾT.
// Đo truy cập bộ nhớ rải rác cộng một cấu trúc dữ liệu có nhánh rẽ khó đoán.
// dijkstra — shortest paths over a generated sparse graph using a HAND-WRITTEN binary heap.
// This measures scattered memory access plus a data structure whose branches are hard to
// predict.
program Dijkstra;
{$mode objfpc}{$H+}{$Q-}{$R-}
uses Common;

const INF = QWord($FFFFFFFFFFFFFFFF);

var
  N, Deg, I, E, U, Vtx: LongInt;
  Head, Edge: array of LongInt;
  W: array of LongWord;
  Rng: TLcg;
  Dist: array of QWord;
  Hd: array of QWord;
  Hv: array of LongInt;
  Hn: LongInt;
  D, Nd, Sum, Reach: QWord;
  T: TTimer;
  Ms: Double;
  C: TChecksum;

procedure Push(Dv: QWord; V: LongInt);
var Idx, P: LongInt; TD: QWord; TV: LongInt;
begin
  if Hn = Length(Hd) then
  begin
    SetLength(Hd, Hn * 2);
    SetLength(Hv, Hn * 2);
  end;
  Hd[Hn] := Dv; Hv[Hn] := V;
  Idx := Hn;
  Inc(Hn);
  while Idx > 0 do
  begin
    P := (Idx - 1) div 2;
    if Hd[P] <= Hd[Idx] then Break;
    TD := Hd[P]; Hd[P] := Hd[Idx]; Hd[Idx] := TD;
    TV := Hv[P]; Hv[P] := Hv[Idx]; Hv[Idx] := TV;
    Idx := P;
  end;
end;

procedure Pop;
var Idx, L, R, M, Last: LongInt; TD: QWord; TV: LongInt;
begin
  Last := Hn - 1;
  Hd[0] := Hd[Last]; Hv[0] := Hv[Last];
  Dec(Hn);
  Idx := 0;
  while True do
  begin
    L := Idx * 2 + 1; R := L + 1; M := Idx;
    if (L < Hn) and (Hd[L] < Hd[M]) then M := L;
    if (R < Hn) and (Hd[R] < Hd[M]) then M := R;
    if M = Idx then Break;
    TD := Hd[M]; Hd[M] := Hd[Idx]; Hd[Idx] := TD;
    TV := Hv[M]; Hv[M] := Hv[Idx]; Hv[Idx] := TV;
    Idx := M;
  end;
end;

begin
  N := Param('n', 200000);
  Deg := Param('deg', 8);

  // Đồ thị dựng ở dạng CSR bằng cùng một LCG ở mọi ngôn ngữ. Phần dựng nằm ngoài đồng hồ —
  // bài này đo tìm đường, không đo sinh dữ liệu.
  // CSR graph built from the same LCG in every language. Construction sits outside the
  // clock: this benchmark measures the search, not the data generation.
  SetLength(Head, N + 1);
  SetLength(Edge, N * Deg);
  SetLength(W, N * Deg);
  Rng.Init(12345);
  for I := 0 to N do Head[I] := I * Deg;
  for I := 0 to N * Deg - 1 do
  begin
    Edge[I] := LongInt(Rng.Next mod LongWord(N));
    W[I] := 1 + Rng.Next mod 1000;
  end;

  T.Start;

  SetLength(Dist, N);
  for I := 0 to N - 1 do Dist[I] := INF;

  // Heap nhị phân trên mảng phẳng, lười xoá: một đỉnh có thể vào heap nhiều lần, lần lấy ra
  // đầu tiên đã là ngắn nhất, các lần sau bỏ qua.
  // A binary heap over flat arrays with lazy deletion: a node may be pushed several times,
  // the first pop is already the shortest, later ones are skipped.
  SetLength(Hd, 1 shl 16);
  SetLength(Hv, 1 shl 16);
  Hn := 0;

  Dist[0] := 0;
  Push(0, 0);
  while Hn > 0 do
  begin
    D := Hd[0];
    U := Hv[0];
    Pop;
    if D > Dist[U] then Continue;  // bản cũ đã lỗi thời / a stale copy
    for E := Head[U] to Head[U + 1] - 1 do
    begin
      Nd := D + W[E];
      Vtx := Edge[E];
      if Nd < Dist[Vtx] then
      begin
        Dist[Vtx] := Nd;
        Push(Nd, Vtx);
      end;
    end;
  end;

  // Tổng khoảng cách là duy nhất bất kể heap phá hoà kiểu gì, nên checksum ổn định.
  // The distance sum is unique no matter how the heap breaks ties, so the checksum is stable.
  Sum := 0; Reach := 0;
  for I := 0 to N - 1 do
    if Dist[I] <> INF then
    begin
      Sum := Sum + Dist[I];
      Inc(Reach);
    end;

  Ms := T.Ms;
  C.Init;
  C.AddU64(Sum);
  C.AddU64(Reach);
  Report(Ms, C.Hex);
end.
