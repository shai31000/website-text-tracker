/**
 * סריקת פורום וחילוץ כותרות פוסטים בלבד
 * כולל ניקוי מילים "שחורות" מתוך הכותרות
 */

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

// כתובת הסריקה
const TARGET_URL =
  "http://www.mizrahit.co/viewforum.php?f=44&sid=98e5840e6e4ec72043282e9656706a34";

// קובץ יעד לכותרות
const TITLES_FILE = path.join(__dirname, "..", "data", "titles.txt");

/**
 * רשימת מילים אסורות
 * כל מילה כאן תוסר מהכותרת (ולא תפסול את כל הכותרת)
 */
const BLACKLIST_WORDS = [
  "להורדה",
  "הורדה",
  "DOWNLOAD"
];

/**
 * פונקציה שמנקה כותרת ממילים אסורות
 */
function cleanTitle(title) {
  let cleaned = title;

  for (const word of BLACKLIST_WORDS) {
    // הסרה גם אם המילה באמצע המשפט
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    cleaned = cleaned.replace(regex, "");
  }

  // ניקוי רווחים כפולים
  return cleaned.replace(/\s+/g, " ").trim();
}

async function run() {
  console.log("Starting scan...");
  console.log("Titles file path:", TITLES_FILE);

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

    /**
     * חילוץ הכותרות מה־DOM
     * לפי class="topictitle"
     */
    const rawTitles = await page.$$eval("a.topictitle", elements =>
      elements.map(el => el.textContent.trim())
    );

    // ניקוי כותרות ממילים אסורות
    const cleanedTitles = rawTitles
      .map(cleanTitle)
      .filter(title => title.length > 0);

    console.log("Titles found:", cleanedTitles.length);

    // קריאה של הקובץ הקיים (אם יש)
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
      fs.appendFileSync(
        TITLES_FILE,
        newTitles.join("\n") + "\n",
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
