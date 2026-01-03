// ייבוא ספריות
const axios = require('axios');   // הורדת תוכן האתר
const cheerio = require('cheerio'); // קריאת HTML
const fs = require('fs');         // קריאה וכתיבה לקבצים
const path = require('path');     // ניהול נתיבים

// כתובת האתר לסריקה
const TARGET_URL = 'http://www.mizrahit.co/viewforum.php?f=44';

// מיקום קובץ התוצאה
const OUTPUT_FILE = path.join(__dirname, '../data/snapshots.json');

// פונקציית הסריקה הראשית
async function scanForum() {
  console.log('Starting scan...');

  try {
    // שלב 1: הורדת HTML מהאתר
    const response = await axios.get(TARGET_URL);
    const html = response.data;

    // שלב 2: טעינת HTML ל-cheerio
    const $ = cheerio.load(html);

    // כאן נשמור את הכותרות שנמצאו עכשיו
    const newTitles = [];

    // שלב 3: שליפת כותרות הפוסטים
    $('a.topictitle').each((i, el) => {
      let title = $(el).text().trim();

      // ניקוי מילים לא רצויות
      title = title.replace('להורדה', '').trim();

      if (title.length > 0) {
        newTitles.push(title);
      }
    });

    // שלב 4: קריאת קובץ קודם אם קיים
    let existingTitles = [];

    if (fs.existsSync(OUTPUT_FILE)) {
      // אם הקובץ קיים – נקרא אותו
      const fileContent = fs.readFileSync(OUTPUT_FILE, 'utf8');

      // הגנה מפני קובץ ריק או פגום
      if (fileContent.trim().length > 0) {
        const parsed = JSON.parse(fileContent);

        if (Array.isArray(parsed.titles)) {
          existingTitles = parsed.titles;
        }
      }
    }

    // שלב 5: סינון כפילויות
    // נוסיף רק כותרות שלא קיימות כבר
    const uniqueNewTitles = newTitles.filter(
      title => !existingTitles.includes(title)
    );

    // חיבור הרשימות
    const finalTitles = existingTitles.concat(uniqueNewTitles);

    // שלב 6: מבנה נתונים סופי
    const outputData = {
      source: TARGET_URL,
      scannedAt: new Date().toISOString(),
      totalTitles: finalTitles.length,
      titles: finalTitles
    };

    // שלב 7: שמירה לקובץ
    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(outputData, null, 2),
      'utf8'
    );

    console.log('Scan completed and data saved.');
    console.log(`Added ${uniqueNewTitles.length} new titles.`);

  } catch (err) {
    console.error('Scan failed:', err.message);
  }
}

// הפעלת הסריקה
scanForum();
