/**
 * סריקת פורום וחילוץ כותרות פוסטים
 * ניקוי מילים שחורות מקובץ חיצוני
 */

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

// כתובת הפורום
const TARGET_URL =
  "http://www.mizrahit.co/viewforum.php?f=44&sid=98e5840e6e4ec72043282e9656706a34";

// קבצים
const TITLES_FILE = path.join(__dirname, "..", "data", "titles.txt");
const BLACKLIST_FILE = path.join(__dirname, "..", "data", "blacklist.txt");

/**
 * קריאת מילים שחורות מקובץ
 */
function loadBlacklist() {
  if (!fs.existsSync(BLACKLIST_FILE)) {
    console.log("Blacklist file not found, continuing without filtering");
    return [];
  }

  return fs
    .readFileSync(BLACKLIST_FILE, "utf-8")
    .split("\n")
    .map(w => w.trim())
    .filter(Boolean);
}

/**
 * ניקוי כותרת ממילים שחורות
 */
function cleanTitle(title, blacklist) {
  let cleaned = title;

  for (const word of blacklist) {
    // החלפה פשוטה – עובד בעברית, אנגלית וכל שפה
    const regex = new RegExp(word, "gi");
    cleaned = cleaned.replace(regex, "");
  }

  // ניקוי רווחים מיותרים אחרי ההסרה
  return cleaned.replace(/\s+/g, " ").trim();
}


async function run() {
  console.log("Starting scan...");

  const blacklist = loadBlacklist();
  console.log("Blacklist words loaded:", blacklist.length);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  try {
    await page.goto(TARGET_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    // חילוץ כותרות מה-DOM
    const rawTitles = await page.$$eval("a.topictitle", els =>
      els.map(el => el.textContent.trim())
    );

    // ניקוי מילים שחורות
    const cleanedTitles = rawTitles
      .map(title => cleanTitle(title, blacklist))
      .filter(title => title.length > 0);

    console.log("Titles found:", cleanedTitles.length);

    // קריאה של כותרות קיימות
    let existingTitles = [];
    if (fs.existsSync(TITLES_FILE)) {
      existingTitles = fs
        .readFileSync(TITLES_FILE, "utf-8")
        .split("\n")
        .map(t => t.trim())
        .filter(Boolean);
    }

    // מניעת כפילויות
    const newTitles = cleanedTitles.filter(
      title => !existingTitles.includes(title)
    );

    if (newTitles.length > 0) {
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


    console.log("New titles added:", newTitles.length);
  } catch (err) {
    console.error("Scan failed:", err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
