

/**
 * SCAN.JS
 * סריקה אוטומטית של פורום
 * כתיבה לקבצים גלובליים ואתריים
 * שמירה היסטורית + Excel
 */

```js
import { ensureDir, getScanTimestamp, getRunFolderName } from './utils/helpers.js';

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const XLSX = require("xlsx");
const { writeTitles, writeHistory } = require("./writers/textWriter");


// =======================
// הגדרת אתר נוכחי
// =======================

const SITE = {
  id: "mizrahit",
  name: "פורום מזרחית",
  url: "http://www.mizrahit.co/viewforum.php?f=44"
};

// =======================
// תיקיות
// =======================

const BASE_DATA = path.join(__dirname, "..", "data");

const GLOBAL_DIR = path.join(BASE_DATA, "global");
const SITE_DIR = path.join(BASE_DATA, "sites", SITE.id);
const ARCHIVE_GLOBAL_DIR = path.join(BASE_DATA, "archive", "global");
const ARCHIVE_SITE_DIR = path.join(BASE_DATA, "archive", SITE.id);

// יצירת תיקיות אם לא קיימות
[
  GLOBAL_DIR,
  SITE_DIR,
  ARCHIVE_GLOBAL_DIR,
  ARCHIVE_SITE_DIR
].forEach(dir => fs.mkdirSync(dir, { recursive: true }));

// =======================
// קבצים קבועים
// =======================

const FILES = {
  titles: "titles.txt",
  history: "history.txt",
  excel: "titles.xlsx",
  blacklist: "blacklist.txt"
};

// =======================
// פונקציות נתיב
// =======================

const globalFile = name => path.join(GLOBAL_DIR, name);
const siteFile = name => path.join(SITE_DIR, name);

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

function cleanText(text, blacklist) {
  let result = text;
  blacklist.forEach(word => {
    result = result.replace(new RegExp(word, "gi"), "");
  });
  return result.replace(/\s+/g, " ").trim();
}

// =======================
// ✅ תיקון: המרת תאריך עברי לפורמט אחיד
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

  // דוגמה: "03 ינואר 2026, 19:53"
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

// =======================
// 1️⃣ סריקה
// =======================

async function scanSite() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  try {
    await page.goto(SITE.url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    return await page.$$eval("tr", rows => {
      const results = [];

      rows.forEach(row => {
        const link = row.querySelector("a.topictitle");
        if (!link) return;

        // 🔧 תיקון: לקחת את תאריך הפוסט האמיתי (האחרון)
        const dateCell = row.querySelector(
          'p.topicdetails[style*="white-space"]'
        );


        results.push({
          title: link.textContent.trim(),
          url: link.href,
          postDate: dateCell ? dateCell.textContent.trim() : ""
        });
      });

      return results;
    });
  } finally {
    await browser.close();
  }
}


// =======================
// 2️⃣ עיבוד
// =======================

function processItems(items, blacklist, existingTitles) {
  const scanDate = new Date().toISOString().slice(0, 10);

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

// =======================
// 4️⃣ כתיבה ל-Excel
// =======================

function writeExcel(newItems) {
  if (!newItems.length) return;

  const loadRows = file => {
    if (!fs.existsSync(file)) return [];
    const wb = XLSX.readFile(file);
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(1);
  };

  const rows = [
    ...newItems.map(i => [i.title, i.postDate, i.url, i.scanDate]),
    ...loadRows(globalFile(FILES.excel))
  ];

  const data = [
    ["כותרת", "תאריך פוסט", "קישור", "תאריך סריקה"],
    ...rows
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!rtl"] = true;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Titles");

  XLSX.writeFile(wb, globalFile(FILES.excel));
  XLSX.writeFile(wb, siteFile(FILES.excel));
}

// =======================
// 5️⃣ שמירת ארכיון ריצה
// =======================

function archiveRun(items) {
  if (!items.length) return;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  const baseLines = items.flatMap(i => [
    i.title,
    i.url,
    i.postDate,
    i.scanDate,
    ""
  ]);

  fs.writeFileSync(
    path.join(ARCHIVE_GLOBAL_DIR, `scan-${stamp}.txt`),
    baseLines.join("\n")
  );

  fs.writeFileSync(
    path.join(ARCHIVE_SITE_DIR, `scan-${stamp}.txt`),
    baseLines.join("\n")
  );
}

// =======================
// פונקציה ראשית
// =======================

async function run() {
  console.log("Starting scan:", SITE.name);

  const blacklist = [
    ...loadBlacklist(globalFile(FILES.blacklist)),
    ...loadBlacklist(siteFile(FILES.blacklist))
  ];

  const existingTitles = fs.existsSync(globalFile(FILES.titles))
    ? fs.readFileSync(globalFile(FILES.titles), "utf-8").split("\n")
    : [];

  const scanned = await scanSite();
  const newItems = processItems(scanned, blacklist, existingTitles);

  console.log("New items:", newItems.length);

  // כתיבה לקבצי TXT – דרך writer ייעודי
writeTitles(globalFile(FILES.titles), newItems);
writeTitles(siteFile(FILES.titles), newItems);

writeHistory(globalFile(FILES.history), newItems);
writeHistory(siteFile(FILES.history), newItems);

  writeExcel(newItems);
  archiveRun(newItems);
}

run().catch(err => {
  console.error("Scan failed:", err);
  process.exit(1);
});
