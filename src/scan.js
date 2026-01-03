/**
 * scan.js
 * סורק דף פורום, מחלץ כותרות נושאים, ושומר אותן לקבצים
 */

const fs = require("fs");
const path = require("path");

// ב־Node 18+ fetch כבר מובנה
const TARGET_URL =
  "http://www.mizrahit.co/viewforum.php?f=44&sid=98e5840e6e4ec72043282e9656706a34";

// נתיבי קבצים
const DATA_DIR = path.join(__dirname, "..", "data");
const SNAPSHOTS_PATH = path.join(DATA_DIR, "snapshots.json");
const TITLES_PATH = path.join(DATA_DIR, "titles.txt");

// ודא שתיקיית data קיימת
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function run() {
  console.log("Starting scan...");

  let html;

  try {
    // הורדת HTML רגיל
    const response = await fetch(TARGET_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    html = await response.text();
  } catch (err) {
    console.error("Failed to fetch page:", err.message);
    process.exit(0); // לא מפיל את ה־Action
  }

  // חילוץ כותרות נושאים מהפורום
  // PHPBB משתמש בקישור עם class="topictitle"
  const titleRegex =
    /<a[^>]+class="topictitle"[^>]*>(.*?)<\/a>/gi;

  const titles = [];
  let match;

  while ((match = titleRegex.exec(html)) !== null) {
    // ניקוי תגיות HTML פנימיות
    const cleanTitle = match[1]
      .replace(/<[^>]*>/g, "")
      .trim();

    if (cleanTitle && cleanTitle.includes("להורדה")) {
      titles.push(cleanTitle);
    }
  }

  console.log("Titles found:", titles.length);

  // קריאת snapshots קיים (אם יש)
  let snapshots = {};
  if (fs.existsSync(SNAPSHOTS_PATH)) {
    try {
      snapshots = JSON.parse(
        fs.readFileSync(SNAPSHOTS_PATH, "utf8")
      );
    } catch {
      snapshots = {};
    }
  }

  // עדכון snapshot
  snapshots[TARGET_URL] = {
    lastScan: new Date().toISOString(),
    titles,
  };

  // שמירת JSON
  fs.writeFileSync(
    SNAPSHOTS_PATH,
    JSON.stringify(snapshots, null, 2),
    "utf8"
  );

  // שמירת TXT (רק הכותרות)
  fs.writeFileSync(
    TITLES_PATH,
    titles.join("\n"),
    "utf8"
  );

  console.log("Scan completed successfully");
}

run();
