/**
 * קובץ זה מוריד את האתר
 * וחולץ ממנו רק את כותרות הפוסטים
 * עם אפשרות לסינון מילים
 */

const fs = require("fs");
const path = require("path");

// כתובת האתר שנסרוק
const TARGET_URL = "http://www.mizrahit.co/viewforum.php?f=44&sid=98e5840e6e4ec72043282e9656706a34";

// קובץ JSON לשמירת היסטוריית הסריקות
const DATA_FILE = path.join(__dirname, "..", "data", "snapshots.json");

// קובץ טקסט עם רשימת הכותרות
const OUTPUT_FILE = path.join(__dirname, "..", "data", "titles.txt");

// מילים שברצונך לסנן מהכותרות
const filterWords = ["להורדה"];

async function run() {
  console.log("Starting scan...");

  try {
    // הורדת HTML מהאתר
    const response = await fetch(TARGET_URL);

    if (!response.ok) {
      throw new Error("Failed to fetch website");
    }

    const html = await response.text();

    // --- חילוץ כותרות הפוסטים בלבד ---
    const matches = [...html.matchAll(/<a[^>]*class="topictitle"[^>]*>(.*?)<\/a>/gi)];

    let titles = matches.map(m => m[1].trim()); // לוקח רק את הטקסט שבתוך ה-a

    // --- פילטור מילים לא רצויות ---
    titles = titles.filter(title => !filterWords.some(word => title.includes(word)));

    console.log("Found titles:", titles.length);

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

run();
