// virtual-call — gọi phương thức ảo qua một mảng trộn lẫn bốn lớp. Xem main.cpp để biết vì
// sao mảng phải trộn lẫn: cùng một lớp thì trình biên dịch gọi thẳng và bài test mất nghĩa.
// virtual-call — virtual dispatch over an array of four mixed classes. See main.cpp for why
// the array must be mixed: with one class the compiler calls directly and this means nothing.
program VirtualCall;
{$mode objfpc}{$H+}{$Q-}{$R-}
uses Common;

type
  TShape = class
    function Area: LongWord; virtual; abstract;
  end;

  TSquare = class(TShape)
    A: LongWord;
    constructor Create(AA: LongWord);
    function Area: LongWord; override;
  end;

  TRect = class(TShape)
    A, B: LongWord;
    constructor Create(AA, AB: LongWord);
    function Area: LongWord; override;
  end;

  TTri = class(TShape)
    A, B: LongWord;
    constructor Create(AA, AB: LongWord);
    function Area: LongWord; override;
  end;

  TLine = class(TShape)
    A: LongWord;
    constructor Create(AA: LongWord);
    function Area: LongWord; override;
  end;

constructor TSquare.Create(AA: LongWord); begin A := AA; end;
function TSquare.Area: LongWord; begin Area := A * A; end;

constructor TRect.Create(AA, AB: LongWord); begin A := AA; B := AB; end;
function TRect.Area: LongWord; begin Area := A * B; end;

constructor TTri.Create(AA, AB: LongWord); begin A := AA; B := AB; end;
function TTri.Area: LongWord; begin Area := (A * B) div 2; end;

constructor TLine.Create(AA: LongWord); begin A := AA; end;
function TLine.Area: LongWord; begin Area := A; end;

var
  N, Passes, I, P: LongInt;
  V: array of TShape;
  Rng: TLcg;
  Kind, A, B, Sum: LongWord;
  T: TTimer;
  Ms: Double;
  C: TChecksum;
begin
  N := Param('n', 1000000);
  Passes := Param('passes', 20);

  SetLength(V, N);
  Rng.Init(5);
  for I := 0 to N - 1 do
  begin
    Kind := Rng.Next mod 4;
    A := Rng.Next mod 1000;
    B := Rng.Next mod 1000;
    case Kind of
      0: V[I] := TSquare.Create(A);
      1: V[I] := TRect.Create(A, B);
      2: V[I] := TTri.Create(A, B);
    else
      V[I] := TLine.Create(A);
    end;
  end;

  T.Start;
  Sum := 0;
  for P := 1 to Passes do
    for I := 0 to N - 1 do Sum := Sum + V[I].Area;
  Ms := T.Ms;

  C.Init;
  C.Add(Sum);
  C.Add(LongWord(Passes));
  Report(Ms, C.Hex);
end.
