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
// פונקציות עזר לתאריכים
// =======================

function getWeekFolder() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const week = String(Math.ceil(now.getDate() / 7)).padStart(2, "0");
  return `${year}-${month}-week${week}`;
}

function getWeekPath(baseDir) {
  const weekFolder = getWeekFolder();
  const weekPath = path.join(baseDir, weekFolder);
  fs.mkdirSync(weekPath, { recursive: true });
  return weekPath;
}

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
    i.desc, // time is now in desc
    i.scanDate,
    i.duration,
    i.channel,
    i.tag,
    ""
  ]);

  prependLines(fileFunc(FILES.fulldata), fulldataLines);
}

function writeTextFilesWeekly(newItems, baseDir) {
  if (!newItems.length) return;

  const weekPath = getWeekPath(baseDir);
  const weekFileFunc = name => path.join(weekPath, name);

  // titles.txt
  const titles = newItems.map(i => i.channel ? i.title + " - " + i.channel : i.title);
  prependLines(weekFileFunc(FILES.titles), titles);

  // fulldata.txt
  const fulldataLines = newItems.flatMap(i => [
    i.channel ? i.title + " - " + i.channel : i.title,
    i.url,
    i.postDate,
    i.desc, // time is now in desc
    i.scanDate,
    i.duration,
    i.channel,
    i.tag,
    ""
  ]);

  prependLines(weekFileFunc(FILES.fulldata), fulldataLines);
}

// =======================
// 4️⃣ כתיבה ל-Excel
// =======================

function writeExcel(newItems, filePath) {
  if (!newItems.length) return;

  const rows = newItems.map(i => [i.title, i.postDate, i.url, i.scanDate, i.desc, i.duration, i.channel, i.tag, i.artistUrl, i.albumUrl, i.channel ? i.title + " - " + i.channel : i.title]);

  const data = [
    ["כותרת", "תאריך פוסט", "קישור", "תאריך סריקה", "שעה", "משך", "ערוץ", "תגית", "קישור אמן", "קישור אלבום", "שיר - אמן"],
    ...rows.map(row => {
      const time = row[4]; // desc contains the time
      row[4] = ""; // Clear the desc field
      row.splice(5, 0, time); // Insert time after scanDate
      return row;
    })
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!rtl"] = true;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Titles");

  XLSX.writeFile(wb, filePath);
}

function writeExcelWeekly(newItems, baseDir) {
  if (!newItems.length) return;

  const weekPath = getWeekPath(baseDir);
  const weekFilePath = path.join(weekPath, FILES.excel);

  const rows = newItems.map(i => [i.title, i.postDate, i.url, i.scanDate, i.desc, i.duration, i.channel, i.tag, i.artistUrl, i.albumUrl, i.channel ? i.title + " - " + i.channel : i.title]);

  const data = [
    ["כותרת", "תאריך פוסט", "קישור", "תאריך סריקה", "שעה", "משך", "ערוץ", "תגית", "קישור אמן", "קישור אלבום", "שיר - אמן"],
    ...rows.map(row => {
      const time = row[4]; // desc contains the time
      row[4] = ""; // Clear the desc field
      row.splice(5, 0, time); // Insert time after scanDate
      return row;
    })
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!rtl"] = true;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Titles");

  XLSX.writeFile(wb, weekFilePath);
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

function archiveRunWeekly(items, archiveDir) {
  if (!items.length) return;

  const weekPath = getWeekPath(archiveDir);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  // Plain text titles
  const titles = items.map(i => i.title);
  fs.writeFileSync(
    path.join(weekPath, `scan-${stamp}-titles.txt`),
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
    path.join(weekPath, `scan-${stamp}-fulldata.txt`),
    baseLines.join("\n")
  );

  // Excel
  const excelPath = path.join(weekPath, `scan-${stamp}.xlsx`);
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

module.exports = { FILES, prependLines, writeTextFiles, writeTextFilesWeekly, writeExcel, writeExcelWeekly, archiveRun, archiveRunWeekly, getWeekPath };
