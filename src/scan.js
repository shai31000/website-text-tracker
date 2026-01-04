/**
 * סריקת פורום, ניקוי כותרות,
 * ויצוא ל־TXT ו־Excel (RTL, עברית)
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
const EXCEL_FILE = path.join(DATA_DIR, "titles.xlsx");
const BLACKLIST_FILE = path.join(DATA_DIR, "blacklist.txt");

// =======================
// מילים שחורות
// =======================

function loadBlacklist() {
  if (!fs.existsSync(BLACKLIST_FILE)) return [];

  return fs.readFileSync(BLACKLIST_FILE, "utf-8")
    .split("\n")
    .map(w => w.trim())
    .filter(Boolean);
}

function cleanTitle(title, blacklist) {
  let cleaned = title;
  for (const word of blacklist) {
    cleaned = cleaned.replace(new RegExp(word, "gi"), "");
  }
  return cleaned.replace(/\s+/g, " ").trim();
}

// =======================
// 1️⃣ סריקה
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

        const details = row.querySelector("p.topicdetails");
        let date = "";
        if (details) {
          const parts = details.innerText.split("\n");
           date = parts.length > 1
            ? parts[parts.length - 1].replace("»", "").trim()
            : "";
        }

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
// 2️⃣ עיבוד
// =======================

function processPosts(rawPosts, blacklist, existingTitles) {
  return rawPosts
    .map(p => ({
      ...p,
      title: cleanTitle(p.title, blacklist)
    }))
    .filter(p =>
      p.title.length > 0 &&
      !existingTitles.includes(p.title)
    );
}

// =======================
// 3️⃣ כתיבה ל־TXT
// =======================

function writeTitlesToTxt(newPosts) {
  if (newPosts.length === 0) return;

  const existing = fs.existsSync(TITLES_FILE)
    ? fs.readFileSync(TITLES_FILE, "utf-8")
        .split("\n").filter(Boolean)
    : [];

  const updated = [
    ...newPosts.map(p => p.title),
    ...existing
  ];

  fs.writeFileSync(
    TITLES_FILE,
    updated.join("\n") + "\n",
    "utf-8"
  );
}

// =======================
// 4️⃣ כתיבה ל־Excel (RTL)
// =======================

function writePostsToExcel(newPosts) {
  if (newPosts.length === 0) return;

  let existing = [];

  if (fs.existsSync(EXCEL_FILE)) {
    const wb = XLSX.readFile(EXCEL_FILE);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    existing = rows.slice(1).map(r => ({
      title: r[0],
      date: r[1],
      url: r[2]
    }));
  }

  const all = [
    ...newPosts,
    ...existing
  ];

  const data = [
    ["כותרת", "תאריך", "קישור"],
    ...all.map(p => [p.title, p.date, p.url])
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();

  // RTL
  wb.Workbook = {
    Views: [{ RTL: true }]
  };

  XLSX.utils.book_append_sheet(wb, ws, "פוסטים");
  XLSX.writeFile(wb, EXCEL_FILE);
}

// =======================
// MAIN
// =======================

async function run() {
  console.log("Starting scan...");

  const blacklist = loadBlacklist();

  const existingTitles = fs.existsSync(TITLES_FILE)
    ? fs.readFileSync(TITLES_FILE, "utf-8")
        .split("\n").filter(Boolean)
    : [];

  const rawPosts = await scanSite(TARGET_URL);
  const newPosts = processPosts(
    rawPosts,
    blacklist,
    existingTitles
  );

  console.log("New posts:", newPosts.length);

  writeTitlesToTxt(newPosts);
  writePostsToExcel(newPosts);
}

run().catch(err => {
  console.error("Scan failed:", err.message);
  process.exit(1);
});
