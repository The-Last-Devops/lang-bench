// file-io — ghi tuần tự rồi đọc lại 256 MB. Đo I/O đĩa, không đo CPU.
// file-io — write then read back 256 MB sequentially. This measures disk I/O, not CPU.
program FileIo;
{$mode objfpc}{$H+}{$Q-}{$R-}
uses SysUtils, BaseUnix, Common;

// fsync khai thẳng từ libc: tên hàm bọc sẵn đổi giữa các bản FPC, còn cái này thì không.
// fsync straight from libc: the name of the wrapper moves between FPC releases, this does not.
function fsync(fd: LongInt): LongInt; cdecl; external 'c';

const SAMPLE = 4096;

var
  Mb, Chunk, K, J, Got, Lim, R: LongInt;
  Dir, Path: string;
  Buf: array of Byte;
  Fd: LongInt;
  Sum: LongWord;
  TotalRead: QWord;
  T: TTimer;
  Ms: Double;
  C: TChecksum;
begin
  Mb := Param('mb', 256);
  Chunk := 1 shl 20;
  Dir := GetEnvironmentVariable('LB_TMPDIR');
  if Dir = '' then Dir := '/tmp';
  Path := Dir + '/lang-bench-io-pascal.bin';

  // Buffer dựng MỘT LẦN, trước đồng hồ. / Buffer built ONCE, before the clock.
  SetLength(Buf, Chunk);
  for J := 0 to Chunk - 1 do Buf[J] := Byte((J * 31 + 7) and $ff);

  T.Start;
  Fd := FpOpen(Path, O_WrOnly or O_Creat or O_Trunc, &644);
  if Fd < 0 then begin WriteLn(StdErr, 'open write failed'); Halt(1); end;
  for K := 1 to Mb do
    if FpWrite(Fd, Buf[0], Chunk) <> Chunk then
    begin WriteLn(StdErr, 'write failed'); Halt(1); end;
  fsync(Fd);
  FpClose(Fd);

  // Chỉ cộng 4 KB đầu mỗi chunk để xác minh — cộng đủ 256 MB byte sẽ biến bài này thành
  // bài đo vòng lặp chứ không còn đo I/O.
  // Verify by summing only the first 4 KB of each chunk — summing all 256 MB would turn this
  // into a loop benchmark instead of an I/O one.
  Sum := 0;
  TotalRead := 0;
  Fd := FpOpen(Path, O_RdOnly);
  if Fd < 0 then begin WriteLn(StdErr, 'open read failed'); Halt(1); end;
  for K := 1 to Mb do
  begin
    Got := 0;
    while Got < Chunk do
    begin
      R := FpRead(Fd, Buf[Got], Chunk - Got);
      if R <= 0 then Break;
      Got := Got + R;
    end;
    TotalRead := TotalRead + QWord(Got);
    if Got < SAMPLE then Lim := Got else Lim := SAMPLE;
    for J := 0 to Lim - 1 do Sum := Sum + Buf[J];
  end;
  FpClose(Fd);
  Ms := T.Ms;
  DeleteFile(Path);

  C.Init;
  C.Add(Sum);
  C.Add(LongWord(TotalRead shr 20));
  C.Add(LongWord(Mb));
  Report(Ms, C.Hex);
end.
