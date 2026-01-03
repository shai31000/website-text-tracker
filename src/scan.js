/**
 * scan.js
 *
 * סקריפט זה:
 * 1. טוען את דף הפורום באמצעות Puppeteer (דפדפן אמיתי)
 * 2. מחלץ רק את כותרות הפוסטים (a.topictitle)
 * 3. מסנן מילים לא רצויות (למשל "להורדה")
 * 4. שומר את הכותרות לקובץ טקסט
 * 5. מעדכן קובץ JSON עם היסטוריית הסריקה
 */

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

// כתובת הדף שנסרק
const TARGET_URL =
  "http://www.mizrahit.co/viewforum.php?f=44&sid=98e5840e6e4ec72043282e9656706a34";

// נתיבים לקבצים
const DATA_FILE = path.join(__dirname, "..", "data", "snapshots.json");
const OUTPUT_FILE = path.join(__dirname, "..", "data", "titles.txt");

// מילים שייסוננו מהכותרות
const FILTER_WORDS = ["להורדה"];

async function run() {
  console.log("Starting scan...");

  // חשוב: הגדרה מראש כדי שלא תהיה שגיאת ReferenceError
  let titles = [];

  try {
    // פתיחת דפדפן headless (מותאם ל-GitHub Actions)
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // טעינת הדף והמתנה לטעינה מלאה
    await page.goto(TARGET_URL, { waitUntil: "networkidle0" });

    // המתנה מפורשת לכך שכותרות יופיעו בדף
    await page.waitForSelector("a.topictitle", { timeout: 15000 });

    // חילוץ הטקסט של כל כותרות הפוסטים
    titles = await page.$$eval("a.topictitle", (links) =>
      links.map((a) => a.textContent.trim())
    );

    await browser.close();

    console.log("Titles found:", titles.length);

    // פילטור מילים לא רצויות
    titles = titles.filter(
      (title) => !FILTER_WORDS.some((word) => title.includes(word))
    );

    console.log("Titles after filtering:", titles.length);

    // שמירה לקובץ טקסט (מחליף את התוכן בכל ריצה)
    fs.writeFileSync(OUTPUT_FILE, titles.join("\n"), "utf-8");
    console.log("titles.txt written successfully");

    // --- עדכון snapshots.json ---
    let snapshots = {};

    if (fs.existsSync(DATA_FILE)) {
      try {
        const content = fs.readFileSync(DATA_FILE, "utf-8").trim();
        snapshots = content ? JSON.parse(content) : {};
      } catch {
        console.log("snapshots.json was invalid, starting fresh");
        snapshots = {};
      }
    }

    snapshots[TARGET_URL] = {
      lastScan: new Date().toISOString(),
      titles,
    };

    fs.writeFileSync(DATA_FILE, JSON.stringify(snapshots, null, 2), "utf-8");
    console.log("snapshots.json updated");
  } catch (err) {
    console.error("Scan failed:", err.message);
    process.exit(1); // חשוב כדי ש-GitHub Actions ידע שהריצה נכשלה
  }
}

// הפעלת הסקריפט
run();
