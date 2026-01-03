/**
 * Scan.js - סריקה של כותרות הפוסטים באתר
 * שימוש ב-Puppeteer כדי לטפל בדפים שמטענים תוכן דינמי
 * שמירה של כותרות מסוננות גם לקובץ JSON וגם לקובץ טקסט
 */

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

// כתובת האתר לסריקה
const TARGET_URL = "http://www.mizrahit.co/viewforum.php?f=44&sid=98e5840e6e4ec72043282e9656706a34";

// קובץ JSON לשמירת היסטוריית הסריקות
const DATA_FILE = path.join(__dirname, "..", "data", "snapshots.json");

// קובץ טקסט עם רשימת הכותרות
const OUTPUT_FILE = path.join(__dirname, "..", "data", "titles.txt");

// מילים שלא נרצה שיופיעו בכותרות
const filterWords = ["להורדה"];

async function run() {
  console.log("Starting scan...");

  try {
    // --- פתיחת דפדפן וטעינת הדף ---
    const browser = await puppeteer.launch({ headless: true }); // headless = ללא חלון גרפי
    const page = await browser.newPage();

    // טעינת הדף עם המתנה עד שכל המשאבים נטענים
    await page.goto(TARGET_URL, { waitUntil: "networkidle0" });

    // --- חילוץ כותרות הפוסטים ---
    // בוחר את כל הקישורים עם class="topictitle"
    let titles = await page.$$eval("a.topictitle", links =>
      links.map(a => a.textContent.trim())
    );

    await browser.close();

    console.log(`Found ${titles.length} titles before filtering.`);

    // --- פילטור מילים לא רצויות ---
    titles = titles.filter(title => !filterWords.some(word => title.includes(word)));

    console.log(`Titles after filtering: ${titles.length}`);

    // --- שמירה לקובץ טקסט ---
    fs.writeFileSync(OUTPUT_FILE, titles.join("\n"), "utf-8");
    console.log(`Filtered titles saved to ${OUTPUT_FILE}`);

    // --- שמירת היסטוריה ב-snapshots.json ---
    let snapshots = {};

    if (fs.existsSync(DATA_FILE)) {
      try {
        const fileContent = fs.readFileSync(DATA_FILE, "utf-8").trim();
        snapshots = fileContent ? JSON.parse(fileContent) : {};
      } catch {
        console.log("Warning: snapshots.json was invalid, starting fresh");
        snapshots = {};
      }
    }

    // שמירת כותרות והזמן האחרון לסריקה
    snapshots[TARGET_URL] = {
      lastScan: new Date().toISOString(),
      titles
    };

    fs.writeFileSync(DATA_FILE, JSON.stringify(snapshots, null, 2), "utf-8");
    console.log("Snapshot JSON updated.");

  } catch (error) {
    console.error("Scan failed:", error.message);
  }
}

// הפעלת הפונקציה
run();
