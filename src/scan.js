/**
 * סריקת פורום, ניקוי כותרות וכתיבה היסטורית
 * הפרדה ברורה בין:
 * סריקה / עיבוד / כתיבה
 */

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const XLSX = require("xlsx");

// =======================
// הגדרות
// =======================

const TARGET_URL =
  "http://www.mizrahit.co/viewforum.php?f=44&sid=98e5840e6e4ec72043282e9656706a34";

const DATA_DIR = path.join(__dirname, "..", "data");

const TITLES_FILE = path.join(DATA_DIR, "titles.txt");
const BLACKLIST_FILE = path.join(DATA_DIR, "blacklist.txt");
const EXCEL_FILE = path.join(DATA_DIR, "titles.xlsx");

// =======================
// טעינת מילים שחורות
// =======================

function loadBlacklist() {
  if (!fs.existsSync(BLACKLIST_FILE)) return [];

  return fs
    .readFileSync(BLACKLIST_FILE, "utf-8")
    .split("\n")
    .map(w => w.trim())
    .filter(Boolean);
}

// =======================
// ניקוי כותרת
// =======================

function cleanTitle(title, blacklist) {
  let cleaned = title;

  for (const word of blacklist) {
    cleaned = cleaned.replace(new RegExp(word, "gi"), "");
  }

  return cleaned.replace(/\s+/g, " ").trim();
}

// =======================
// 1️⃣ סריקה (כותרת + תאריך + קישור)
// =======================

async function scanSite(url) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    return await page.$$eval("tr", rows => {
      const results = [];

      rows.forEach(row => {
        const link = row.querySelector("a.topictitle");
        if (!link) return;

        const title = link.textContent.trim();
        const href = link.getAttribute("href");

        let date = "";
        const detailParagraphs = row.querySelectorAll("p.topicdetails");

        detailParagraphs.forEach(p => {
          const text = p.innerText.trim();
          if (text.includes(",")) {
            date = text;
          }
        });

        results.push({
          title,
          date,
          url: href.startsWith("http")
            ? href
            : "http://www.mizrahit.co/" + href.replace("./", "")
        });
      });

      return results;
    });
  } finally {
    await browser.close();
  }
}

// =======================
// 2️⃣ עיבוד וסינון
// =======================

function processItems(rawItems, blacklist, existingTitles) {
  return rawItems
    .map(item => ({
      title: cleanTitle(item.title, blacklist),
      date: item.date,
      url: item.url
    }))
    .filter(item => item.title.length > 0)
    .filter(item => !existingTitles.includes(item.title));
}

// =======================
// 3️⃣ כתיבה לקובץ טקסט
// =======================

function writeTitlesToText(newItems) {
  if (newItems.length === 0) return;

  const existing = fs.existsSync(TITLES_FILE)
    ? fs.readFileSync(TITLES_FILE, "utf-8").trim().split("\n")
    : [];

  const updated = [
    ...newItems.map(i => i.title),
    ...existing
  ];

  fs.writeFileSync(TITLES_FILE, updated.join("\n") + "\n", "utf-8");
}

// =======================
// 4️⃣ כתיבה ל-Excel (RTL)
// =======================

function writeTitlesToExcel(newItems) {
  if (newItems.length === 0) return;

  let existingRows = [];

  if (fs.existsSync(EXCEL_FILE)) {
    const wb = XLSX.readFile(EXCEL_FILE);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

    existingRows = rows.slice(1); // בלי כותרת
  }

  const newRows = newItems.map(item => [
    item.title,
    item.date,
    item.url
  ]);

  const data = [
    ["כותרת", "תאריך", "קישור"],
    ...newRows,
    ...existingRows
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // RTL
  ws["!rtl"] = true;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Titles");

  XLSX.writeFile(wb, EXCEL_FILE);
}

// =======================
// פונקציה ראשית
// =======================

async function run() {
  console.log("Starting scan...");

  const blacklist = loadBlacklist();

  const existingTitles = fs.existsSync(TITLES_FILE)
    ? fs.readFileSync(TITLES_FILE, "utf-8")
        .split("\n")
        .map(t => t.trim())
        .filter(Boolean)
    : [];

  const rawItems = await scanSite(TARGET_URL);
  console.log("Items found:", rawItems.length);

  const newItems = processItems(
    rawItems,
    blacklist,
    existingTitles
  );

  console.log("New items:", newItems.length);

  writeTitlesToText(newItems);
  writeTitlesToExcel(newItems);
}

run().catch(err => {
  console.error("Scan failed:", err.message);
  process.exit(1);
});
