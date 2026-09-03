// Điểm tổng hợp = trung bình HÌNH HỌC của tỉ lệ so với ngôn ngữ nhanh nhất mỗi bài,
// quy về thang 100 (đây là cách SPEC làm). Chỉ tính bài mà checksum khớp cả 5 ngôn ngữ.
// Overall score = the GEOMETRIC mean of each benchmark's ratio to the fastest language,
// scaled to 100 (this is what SPEC does). Only benchmarks whose checksum matched count.
export function computeScores({ results, languages, benchmarks }) {
  const usable = benchmarks.filter((b) => {
    const row = results[b.id];
    if (!row) return false;
    const values = languages.map((l) => row[l.id]).filter((r) => r && r.ok);
    return values.length === languages.length && row.checksumMatch === true;
  });

  const scoreOver = (bench, langId) => {
    const ratios = [];
    for (const b of bench) {
      const row = results[b.id];
      const times = languages.map((l) => row[l.id].median);
      const fastest = Math.min(...times);
      const mine = row[langId].median;
      if (!(mine > 0)) return null;
      ratios.push(fastest / mine);
    }
    if (ratios.length === 0) return null;
    const logSum = ratios.reduce((acc, r) => acc + Math.log(r), 0);
    return Math.exp(logSum / ratios.length) * 100;
  };

  const overall = {};
  for (const l of languages) overall[l.id] = scoreOver(usable, l.id);

  const byGroup = {};
  for (const groupId of [...new Set(benchmarks.map((b) => b.group))]) {
    const inGroup = usable.filter((b) => b.group === groupId);
    byGroup[groupId] = {};
    for (const l of languages) byGroup[groupId][l.id] = inGroup.length ? scoreOver(inGroup, l.id) : null;
  }

  const wins = {};
  for (const l of languages) wins[l.id] = 0;
  for (const b of usable) {
    const row = results[b.id];
    let best = null;
    for (const l of languages) {
      const t = row[l.id].median;
      if (best === null || t < row[best].median) best = l.id;
    }
    if (best) wins[best] += 1;
  }

  return { overall, byGroup, wins, countedBenchmarks: usable.map((b) => b.id) };
}
