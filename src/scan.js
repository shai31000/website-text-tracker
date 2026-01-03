/**
 * קובץ זה אחראי להורדת תוכן מאתר אינטרנט
 * ולשמירת הטקסט שלו בקובץ snapshots.json
 *
 * הקוד כתוב בצורה פשוטה ומוסברת שורה־שורה
 */

// מודול מובנה של Node.js לקריאת קבצים
// משמש אותנו לקרוא ולכתוב קובץ JSON
const fs = require("fs");

// מודול מובנה שמאפשר עבודה עם נתיבים (paths)
// עוזר לנו לבנות נתיב תקין לקובץ בכל מערכת
const path = require("path");

// כתובת האתר שנסרוק
// בשלב זה – אתר אחד בלבד
const TARGET_URL = "http://www.mizrahit.co/viewforum.php?f=44&sid=98e5840e6e4ec72043282e9656706a34";

// מיקום קובץ הנתונים
const DATA_FILE = path.join(__dirname, "..", "data", "snapshots.json");

/**
 * פונקציה ראשית
 * כל הקוד שלנו ירוץ מתוכה
 */
async function run() {
  console.log("Starting scan...");

  try {
    // הורדת תוכן האתר
    const response = await fetch(TARGET_URL);

    // בדיקה שהבקשה הצליחה
    if (!response.ok) {
      throw new Error("Failed to fetch website");
    }

    // קבלת ה-HTML כטקסט
    const html = await response.text();

    // ניקוי גס של תגיות HTML
    // המטרה: להשאיר טקסט קריא בלבד
    const textOnly = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // קריאת המידע הקיים מהקובץ
    let snapshots = {};
    if (fs.existsSync(DATA_FILE)) {
      snapshots = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    }

    // שמירת צילום המצב הנוכחי
    snapshots[TARGET_URL] = {
      lastScan: new Date().toISOString(),
      text: textOnly
    };

    // כתיבה חזרה לקובץ
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(snapshots, null, 2),
      "utf-8"
    );

    console.log("Scan completed and data saved.");
  } catch (error) {
    console.error("Scan failed:", error.message);
  }
}

// הפעלת הפונקציה
run();
