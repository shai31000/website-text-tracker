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
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  let datePart = clean;
  let timePart = "";

  if (clean.includes(" ")) {
    const spaceIndex = clean.indexOf(" ");
    datePart = clean.substring(0, spaceIndex);
    timePart = clean.substring(spaceIndex + 1).split(" ")[0]; // take first part after space
  }

  let normalized = datePart;

  // Special handling for time-date format (e.g., Rotter: "02:14-12-31")
  if (timePart && timePart.includes("-")) {
    const parts = timePart.split("-");
    if (parts.length >= 3) {
      const time = parts[0]; // "02:14"
      const month = parts[1].padStart(2, "0"); // "12"
      const day = parts[2].padStart(2, "0"); // "31"
      normalized = `${datePart}-${day}-${month}`;
      return `${normalized} | ${time}`;
    }
  }

  if (datePart.includes("/")) {
    // דוגמה: "17/08/2025"
    const parts = datePart.split("/");
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2];
      normalized = `${year}-${month}-${day}`;
    }
  } else if (datePart.includes(".")) {
    // דוגמה: "31.12.25"
    const parts = datePart.split(".");
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = "20" + parts[2];
      normalized = `${year}-${month}-${day}`;
    }
  } else {
    // דוגמה: "03 ינואר 2026"
    const parts = datePart.split(/\s+/);
    if (parts.length >= 3) {
      const day = parts[0].padStart(2, "0");
      const monthName = parts[1];
      const year = parts[2];
      const month = months[monthName];
      if (month) {
        normalized = `${year}-${month}-${day}`;
      }
    }
  }

  if (timePart) {
    return `${normalized} | ${timePart}`;
  } else {
    return normalized;
  }
}

module.exports = { loadBlacklist, cleanText, normalizeDate, escapeRegExp };
