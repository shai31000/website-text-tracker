/**
 * textWriter.js
 * =======================
 * אחראי אך ורק על כתיבה לקבצי טקסט (TXT)
 * ❌ לא סורק
 * ❌ לא מעבד
 * ✔ מקבל נתונים מוכנים וכותב לפלטים
 */

const fs = require("fs");
const path = require("path");

// =======================
// כתיבה עם הוספה לראש הקובץ
// =======================
function prependLines(filePath, lines) {
  const existing = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf-8")
    : "";

  fs.writeFileSync(filePath, lines.join("\n") + "\n" + existing);
}

// =======================
// כתיבת titles.txt
// =======================
function writeTitles(filePath, items) {
  if (!items.length) return;
  const titles = items.map(i => i.title);
  prependLines(filePath, titles);
}

// =======================
// כתיבת history.txt
// =======================
function writeHistory(filePath, items) {
  if (!items.length) return;

  const lines = items.flatMap(i => [
    i.title,
    i.url,
    i.postDate,
    i.scanDate,
    ""
  ]);

  prependLines(filePath, lines);
}

module.exports = {
  writeTitles,
  writeHistory
};
