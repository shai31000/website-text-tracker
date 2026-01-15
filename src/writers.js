const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// =======================
// קבצים קבועים
// =======================

const FILES = {
  titles: "titles.txt",
  fulldata: "fulldata.txt",
  excel: "titles.xlsx",
  blacklist: "blacklist.txt"
};

// =======================
// 3️⃣ כתיבה לקבצי טקסט
// =======================

function prependLines(filePath, lines) {
  const existing = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf-8")
    : "";
  fs.writeFileSync(filePath, lines.join("\n") + "\n" + existing);
}

function writeTextFiles(newItems, fileFunc) {
  if (!newItems.length) return;

  // titles.txt
  const titles = newItems.map(i => i.channel ? i.title + " - " + i.channel : i.title);
  prependLines(fileFunc(FILES.titles), titles);

  // fulldata.txt
  const fulldataLines = newItems.flatMap(i => [
    i.channel ? i.title + " - " + i.channel : i.title,
    i.url,
    i.postDate,
    i.scanDate,
    i.desc,
    i.duration,
    i.channel,
    i.tag,
    ""
  ]);

  prependLines(fileFunc(FILES.fulldata), fulldataLines);
}

// =======================
// 4️⃣ כתיבה ל-Excel
// =======================

function writeExcel(newItems, filePath) {
  if (!newItems.length) return;

  const loadRows = file => {
    if (!fs.existsSync(file)) return [];
    const wb = XLSX.readFile(file);
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(1).map(row => [...row, "", "", "", ""]); // Add empty desc, duration, channel, tag, artistUrl, albumUrl, song-artist for old rows
  };

  const rows = [
    ...newItems.map(i => [i.title, i.postDate, i.url, i.scanDate, i.desc, i.duration, i.channel, i.tag, i.artistUrl, i.albumUrl, i.channel ? i.title + " - " + i.channel : i.title]),
    ...loadRows(filePath)
  ];

  const data = [
    ["כותרת", "תאריך פוסט", "קישור", "תאריך סריקה", "תיאור", "משך", "ערוץ", "תגית", "קישור אמן", "קישור אלבום", "שיר - אמן"],
    ...rows
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!rtl"] = true;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Titles");

  XLSX.writeFile(wb, filePath);
}

// =======================
// 5️⃣ שמירת ארכיון ריצה
// =======================

function archiveRun(items, archiveDir) {
  if (!items.length) return;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  // Plain text titles
  const titles = items.map(i => i.title);
  fs.writeFileSync(
    path.join(archiveDir, `scan-${stamp}-titles.txt`),
    titles.join("\n")
  );

  // Metadata text
  const baseLines = items.flatMap(i => [
    i.channel ? i.title + " - " + i.channel : i.title,
    i.url,
    i.postDate,
    i.scanDate,
    i.desc,
    i.duration,
    i.channel,
    i.tag,
    ""
  ]);
  fs.writeFileSync(
    path.join(archiveDir, `scan-${stamp}-fulldata.txt`),
    baseLines.join("\n")
  );

  // Excel
  const excelPath = path.join(archiveDir, `scan-${stamp}.xlsx`);
  const data = [
    ["כותרת", "תאריך פוסט", "קישור", "תאריך סריקה", "תיאור", "משך", "ערוץ", "תגית", "קישור אמן", "קישור אלבום", "שיר - אמן"],
    ...items.map(i => [i.title, i.postDate, i.url, i.scanDate, i.desc, i.duration, i.channel, i.tag, i.artistUrl, i.albumUrl, i.channel ? i.title + " - " + i.channel : i.title])
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!rtl"] = true;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Titles");
  XLSX.writeFile(wb, excelPath);
}

module.exports = { FILES, prependLines, writeTextFiles, writeExcel, archiveRun };
