const fs = require("fs");

// =======================
// טעינת blacklist
// =======================

function loadBlacklist(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf-8")
    .split("\n")
    .map(w => w.trim())
    .filter(Boolean);
}

// =======================
// ניקוי טקסט
// =======================

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\// =======================
// ניקוי טקסט
// =======================

function cleanText(text, blacklist) {
  let result = text;
  blacklist.forEach(word => {
    result = result.replace(new RegExp(word, "gi"), "");
  });
  return result.replace(/\s+/g, " ").trim();
}');
}

function cleanText(text, blacklist) {
  let result = text;
  blacklist.forEach(word => {
    result = result.replace(new RegExp(escapeRegExp(word), "gi"), "");
  });
  return result.replace(/\s+/g, " ").trim();
}

// =======================
// המרת תאריך עברי לפורמט אחיד
// =======================

function normalizeDate(raw) {
  if (!raw) return "";

  // מפת חודשים בעברית
  const months = {
    "ינואר": "01",
    "פברואר": "02",
    "מרץ": "03",
    "אפריל": "04",
    "מאי": "05",
    "יוני": "06",
    "יולי": "07",
    "אוגוסט": "08",
    "ספטמבר": "09",
    "אוקטובר": "10",
    "נובמבר": "11",
    "דצמבר": "12"
  };

  const clean = raw.replace(",", "").trim();

  if (clean.includes("/")) {
    // דוגמה: "17/08/2025"
    const parts = clean.split("/");
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  } else if (clean.includes(".")) {
    // דוגמה: "31.12.25"
    const parts = clean.split(".");
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = "20" + parts[2];
      return `${year}-${month}-${day}`;
    }
  } else {
    // דוגמה: "03 ינואר 2026, 19:53"
    const parts = clean.split(/\s+/);
    if (parts.length >= 3) {
      const day = parts[0].padStart(2, "0");
      const monthName = parts[1];
      const year = parts[2];
      const month = months[monthName];
      if (month) {
        return `${year}-${month}-${day}`;
      }
    }
  }

  return raw;
}

module.exports = { loadBlacklist, cleanText, normalizeDate, escapeRegExp };
