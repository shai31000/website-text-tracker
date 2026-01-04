/**
 * סריקת פורום, ניקוי כותרות וכתיבה היסטורית
 * הפרדה ברורה בין:
 * סריקה / עיבוד / כתיבה
 */

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

// =======================
// הגדרות קבצים וכתובת
// =======================

const TARGET_URL =
  "http://www.mizrahit.co/viewforum.php?f=44&sid=98e5840e6e4ec72043282e9656706a34";

const DATA_DIR = path.join(__dirname, "..", "data");
const TITLES_FILE = path.join(DATA_DIR, "titles.txt");
const BLACKLIST_FILE = path.join(DATA_DIR, "blacklist.txt");

const XLSX = require("xlsx");

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
// 1️⃣ סריקה בלבד
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

    const titles = await page.$$eval("a.topictitle", els =>
      els.map(el => el.textContent.trim())
    );

    return titles;
  } finally {
    await browser.close();
  }
}

// =======================
// 2️⃣ עיבוד כותרות
// =======================

function processTitles(rawTitles, blacklist, existingTitles) {
  const cleaned = rawTitles
    .map(title => cleanTitle(title, blacklist))
    .filter(title => title.length > 0);

  // החזרת רק כותרות חדשות
  return cleaned.filter(
    title => !existingTitles.includes(title)
  );
}

// =======================
// 3️⃣ כתיבה לקובץ
// =======================

function writeTitlesToFile(newTitles) {
  if (newTitles.length === 0) return;

  let existingTitles = [];
  if (fs.existsSync(TITLES_FILE)) {
    existingTitles = fs
      .readFileSync(TITLES_FILE, "utf-8")
      .split("\n")
      .map(t => t.trim())
      .filter(Boolean);
  }

  const updatedTitles = [
    ...newTitles,
    ...existingTitles
  ];

  fs.writeFileSync(
    TITLES_FILE,
    updatedTitles.join("\n") + "\n",
    "utf-8"
  );
}

function writeTitlesToExcel(newTitles) {
  if (newTitles.length === 0) return;

  let existingTitles = [];

  // אם הקובץ קיים – נטען אותו
  if (fs.existsSync(EXCEL_FILE)) {
    const workbook = XLSX.readFile(EXCEL_FILE);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // דילוג על שורת כותרת
    existingTitles = rows
      .slice(1)
      .map(row => row[0])
      .filter(Boolean);
  }

  // חדשות למעלה, ישנות למטה
  const allTitles = [
    ...newTitles,
    ...existingTitles
  ];

  // בניית נתונים ל-Excel
  const data = [
    ["Title"], // כותרת עמודה
    ...allTitles.map(title => [title])
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Titles");
  XLSX.writeFile(workbook, EXCEL_FILE);
}

// =======================
// פונקציה ראשית
// =======================

async function run() {
  console.log("Starting scan...");

  const blacklist = loadBlacklist();
  console.log("Blacklist words:", blacklist.length);

  const existingTitles = fs.existsSync(TITLES_FILE)
    ? fs.readFileSync(TITLES_FILE, "utf-8")
        .split("\n")
        .map(t => t.trim())
        .filter(Boolean)
    : [];

  const rawTitles = await scanSite(TARGET_URL);
  console.log("Raw titles found:", rawTitles.length);

  const newTitles = processTitles(
    rawTitles,
    blacklist,
    existingTitles
  );

  console.log("New titles:", newTitles.length);

  writeTitlesToFile(newTitles);
  writeTitlesToExcel(newTitles);
}

run().catch(err => {
  console.error("Scan failed:", err.message);
  process.exit(1);
});
