// json — dựng 100k record, serialize ra chuỗi, parse lại, đọc số liệu.
// Đây là một trong hai bài CỐ Ý dùng thư viện: fpjson của FPC, tương đương JSON.parse của
// V8 hay json.loads của Python — bài này so thư viện JSON, và điều đó được nói rõ.
// json — build 100k records, serialize to a string, parse it back, read the fields.
// One of the two benchmarks that deliberately uses a library: FPC's fpjson, the counterpart
// of V8's JSON.parse or Python's json.loads. This compares JSON libraries, and says so.
program JsonBench;
{$mode objfpc}{$H+}{$Q-}{$R-}
uses SysUtils, Classes, fpjson, jsonparser, Common;

var
  N, I: LongInt;
  Docs, Back: TJSONArray;
  Rec: TJSONObject;
  Text: AnsiString;
  Stream: TStringStream;
  Parsed: TJSONData;
  SumId, SumScore, Active: LongWord;
  T: TTimer;
  Ms: Double;
  C: TChecksum;
begin
  N := Param('n', 100000);

  // CompressedJSON: fpjson mặc định chèn khoảng trắng quanh dấu hai chấm và dấu phẩy, nên
  // chuỗi dài hơn hẳn — mà độ dài chuỗi nằm trong checksum, tức là phải in gọn như mọi
  // ngôn ngữ khác.
  // CompressedJSON: fpjson pads colons and commas with spaces by default, making a longer
  // string — and the string length is part of the checksum, so it must print compactly like
  // every other language.
  TJSONData.CompressedJSON := True;

  T.Start;
  Docs := TJSONArray.Create;
  for I := 0 to N - 1 do
  begin
    Rec := TJSONObject.Create;
    Rec.Add('id', I);
    Rec.Add('name', 'user' + IntToStr(I));
    Rec.Add('score', (I * 37) mod 1000);
    Rec.Add('active', I mod 3 = 0);
    Docs.Add(Rec);
  end;
  // Đổ qua stream chứ không dùng AsJSON: AsJSON nối chuỗi dồn dần, 100k phần tử thành phép
  // nối bậc hai và bài test hoá ra đo phép nối chuỗi thay vì đo thư viện JSON.
  // Dumped through a stream rather than AsJSON: AsJSON appends into one growing string, so
  // 100k elements make it quadratic and the benchmark ends up measuring string concatenation
  // instead of the JSON library.
  Stream := TStringStream.Create('');
  Docs.DumpJSON(Stream);
  Text := Stream.DataString;
  Parsed := GetJSON(Text);
  Back := TJSONArray(Parsed);

  SumId := 0; SumScore := 0; Active := 0;
  for I := 0 to Back.Count - 1 do
  begin
    Rec := TJSONObject(Back.Items[I]);
    SumId := SumId + LongWord(Rec.Integers['id']);
    SumScore := SumScore + LongWord(Rec.Integers['score']);
    if Rec.Booleans['active'] then Inc(Active);
  end;
  Ms := T.Ms;

  C.Init;
  C.Add(SumId);
  C.Add(SumScore);
  C.Add(Active);
  C.Add(LongWord(Length(Text)));
  Report(Ms, C.Hex);
end.
