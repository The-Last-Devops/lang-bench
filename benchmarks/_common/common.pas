// Tiện ích dùng chung cho các bài test Pascal / Shared helpers for the Pascal benchmarks.
unit Common;

{$mode objfpc}{$H+}{$modeswitch advancedrecords}
// Q- tắt kiểm tra tràn số, R- tắt kiểm tra biên: checksum ở đây CỐ Ý tràn vòng 32-bit,
// và bốn ngôn ngữ kia cũng vậy. Bật lên là chương trình chết ngay phép nhân đầu tiên.
// Q- disables overflow checks and R- range checks: the checksum here wraps around 32 bits
// ON PURPOSE, exactly as the other languages do. With them on, the first multiply aborts.
{$Q-}{$R-}

interface

uses SysUtils;

type
  // Đồng hồ đo phần việc thật, không tính khởi động tiến trình.
  // Clock around the real work only, excluding process startup.
  TTimer = record
    T0: Int64;
    procedure Start;
    function Ms: Double;
  end;

  // Checksum 32-bit: mọi ngôn ngữ phải cho ra cùng một giá trị.
  // 32-bit checksum: every language must produce the same value.
  TChecksum = record
    H: LongWord;
    procedure Init;
    procedure Add(V: LongWord);
    procedure AddU64(V: QWord);
    function Value: LongWord;
    function Hex: string;
  end;

  // Sinh số giả ngẫu nhiên xác định: cùng công thức ở mọi ngôn ngữ.
  // Deterministic PRNG: the exact same formula in every language.
  TLcg = record
    S: LongWord;
    procedure Init(Seed: LongWord);
    function Next: LongWord;
  end;

// Đọc tham số dạng key=value từ dòng lệnh.
// Read a key=value parameter off the command line.
function Param(const Key: string; Fallback: Int64): Int64;

// Dòng duy nhất mà runner đọc. / The single line the runner parses.
procedure Report(Ms: Double; const Checksum: string);

implementation

// Đồng hồ đơn điệu lấy thẳng từ libc. Unit nào bọc sẵn clock_gettime thì mỗi bản FPC lại
// để ở một chỗ khác nhau; khai báo thẳng ở đây thì bản nào cũng dịch được.
// The monotonic clock straight from libc. Which FPC unit wraps clock_gettime moves between
// releases; declaring it here compiles on all of them.
type
  TTimeSpec = record
    tv_sec: Int64;
    tv_nsec: Int64;
  end;

const CLOCK_MONOTONIC = 1;

function clock_gettime(clk_id: LongInt; var tp: TTimeSpec): LongInt; cdecl; external 'c';

function NowNs: Int64;
var ts: TTimeSpec;
begin
  clock_gettime(CLOCK_MONOTONIC, ts);
  NowNs := ts.tv_sec * Int64(1000000000) + ts.tv_nsec;
end;

procedure TTimer.Start;
begin
  T0 := NowNs;
end;

function TTimer.Ms: Double;
begin
  Ms := (NowNs - T0) / 1000000.0;
end;

procedure TChecksum.Init;
begin
  H := 2166136261;  // FNV-1a offset basis
end;

procedure TChecksum.Add(V: LongWord);
var i: Integer;
begin
  for i := 0 to 3 do
  begin
    H := H xor ((V shr (i * 8)) and $ff);
    H := H * 16777619;
  end;
end;

procedure TChecksum.AddU64(V: QWord);
begin
  Add(LongWord(V and $ffffffff));
  Add(LongWord(V shr 32));
end;

function TChecksum.Value: LongWord;
begin
  Value := H;
end;

function TChecksum.Hex: string;
begin
  Hex := LowerCase(HexStr(H, 8));
end;

procedure TLcg.Init(Seed: LongWord);
begin
  S := Seed;
end;

function TLcg.Next: LongWord;
begin
  S := S * 1664525 + 1013904223;
  Next := S;
end;

function Param(const Key: string; Fallback: Int64): Int64;
var
  i: Integer;
  Prefix, Arg: string;
  V: Int64;
begin
  Prefix := Key + '=';
  for i := 1 to ParamCount do
  begin
    Arg := ParamStr(i);
    if Copy(Arg, 1, Length(Prefix)) = Prefix then
    begin
      if TryStrToInt64(Copy(Arg, Length(Prefix) + 1, Length(Arg)), V) then
        Exit(V);
    end;
  end;
  Param := Fallback;
end;

procedure Report(Ms: Double; const Checksum: string);
var Fs: TFormatSettings;
begin
  // Dấu thập phân phải là chấm dù locale nào: runner parse dòng này bằng JSON.parse.
  // The decimal separator must be a dot whatever the locale: the runner reads this line
  // with JSON.parse.
  Fs := DefaultFormatSettings;
  Fs.DecimalSeparator := '.';
  WriteLn('{"ms": ', FormatFloat('0.000', Ms, Fs), ', "checksum": "', Checksum, '"}');
end;

end.
