// parallel — chia matmul cho nhiều luồng. Cùng tổng lượng việc như bài matmul, nên checksum
// phải trùng với matmul ở cùng n.
// parallel — split matmul across threads. Same total work as the matmul benchmark, so the
// checksum must match matmul at the same n.
program ParallelMatmul;
{$mode objfpc}{$H+}{$Q-}{$R-}
uses
  {$ifdef unix}cthreads,{$endif}
  Common;

// Số lõi hỏi thẳng libc: đây là con số hạn mức container cấp cho tiến trình, cùng nguồn
// với các ngôn ngữ khác.
// The core count comes straight from libc: this is the number the container limit gives the
// process, the same source the other languages read.
function sysconf(name: LongInt): LongInt; cdecl; external 'c';
const _SC_NPROCESSORS_ONLN = 84;

var
  N, Threads: LongInt;
  A, B, C: array of Int64;

// Mỗi luồng nhận một dải hàng của ma trận kết quả, không luồng nào chạm hàng của luồng
// khác — nên không cần khoá nào cả.
// Each thread owns a band of result rows and never touches another thread's, so no lock is
// needed anywhere.
function Worker(P: Pointer): PtrInt;
var W, Lo, Hi, I, J, Kk: LongInt; Aik: Int64;
begin
  W := PtrInt(P);
  Lo := LongInt((Int64(N) * W) div Threads);
  Hi := LongInt((Int64(N) * (W + 1)) div Threads);
  for I := Lo to Hi - 1 do
    for Kk := 0 to N - 1 do
    begin
      Aik := A[I * N + Kk];
      for J := 0 to N - 1 do
        C[I * N + J] := C[I * N + J] + Aik * B[Kk * N + J];
    end;
  Worker := 0;
end;

var
  I, J, W: LongInt;
  Handles: array of TThreadID;
  Sum: QWord;
  T: TTimer;
  Ms: Double;
  Ck: TChecksum;
begin
  N := Param('n', 256);
  Threads := Param('threads', 0);
  if Threads <= 0 then Threads := sysconf(_SC_NPROCESSORS_ONLN);
  if Threads <= 0 then Threads := 1;

  SetLength(A, N * N);
  SetLength(B, N * N);
  SetLength(C, N * N);
  for I := 0 to N - 1 do
    for J := 0 to N - 1 do
    begin
      A[I * N + J] := (I * 31 + J * 17) mod 100;
      B[I * N + J] := (I * 13 + J * 7) mod 100;
      C[I * N + J] := 0;
    end;

  T.Start;
  SetLength(Handles, Threads);
  for W := 0 to Threads - 1 do Handles[W] := BeginThread(@Worker, Pointer(PtrInt(W)));
  for W := 0 to Threads - 1 do WaitForThreadTerminate(Handles[W], 0);
  Sum := 0;
  for I := 0 to N * N - 1 do Sum := Sum + QWord(C[I]);
  Ms := T.Ms;

  Ck.Init;
  Ck.AddU64(Sum);
  Report(Ms, Ck.Hex);
end.
