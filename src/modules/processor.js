const fs = require("fs");
const path = require("path");

/**
 * טעינת רשימת שחורה מקובץ
 * @param {string} filePath
 * @returns {Array<string>}
 */
function loadBlacklist(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf-8")
    .split("\n")
    .map(w => w.trim())
    .filter(Boolean);
}

/**
 * ניקוי טקסט מרשימת שחורה
 * @param {string} text
 * @param {Array<string>} blacklist
 * @returns {string}
 */
function cleanText(text, blacklist) {
  let result = text;
  blacklist.forEach(word => {
    result = result.replace(new RegExp(word, "gi"), "");
  });
  return result.replace(/\s+/g, " ").trim();
}

/**
 * המרת תאריך עברי לפורמט אחיד YYYY-MM-DD
 * @param {string} raw
 * @returns {string}
 */
function normalizeDate(raw) {
  if (!raw) return "";

  const months = {
    "ינואר": "01", "פברואר": "02", "מרץ": "03", "אפריל": "04",
    "מאי": "05", "יוני": "06", "יולי": "07", "אוגוסט": "08",
    "ספטמבר": "09", "אוקטובר": "10", "נובמבר": "11", "דצמבר": "12"
  };

  const clean = raw.replace(",", "").trim();
  const parts = clean.split(/\s+/);

  if (parts.length < 3) return raw;

  const day = parts[0].padStart(2, "0");
  const monthName = parts[1];
  const year = parts[2];

  const month = months[monthName];
  if (!month) return raw;

  return `${year}-${month}-${day}`;
}

/**
 * עיבוד items: ניקוי, סינון כפולים, חישוב new items
 * @param {Array} items - מהscanner
 * @param {Array<string>} globalBlacklist
 * @param {Array<string>} pageBlacklist
 * @param {Array<string>} existingTitles - כותרות קיימות לכל type
 * @param {string} scanDate
 * @returns {Array} newItems
 */
function processItems(items, globalBlacklist, pageBlacklist, existingTitles, scanDate) {
  const blacklist = [...globalBlacklist, ...pageBlacklist];

  return items
    .map(item => {
      const cleanTitle = cleanText(item.title, blacklist);
      if (!cleanTitle) return null;
      if (existingTitles.includes(cleanTitle)) return null;

      return {
        title: cleanTitle,
        url: item.url,
        postDate: normalizeDate(item.postDate),
        scanDate
      };
    })
    .filter(Boolean);
}

module.exports = { loadBlacklist, cleanText, normalizeDate, processItems };