/**
 * SCAN.JS
 * סריקה אוטומטית של פורום
 * כתיבה לקבצים גלובליים ואתריים
 * שמירה היסטורית + Excel
 */

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const XLSX = require("xlsx");

// =======================
// טעינת אתרים מהקונפיג
// =======================

const sites = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "sites.json"), "utf-8"));

// =======================
// תיקיות
// =======================

const BASE_DATA = path.join(__dirname, "..", "data");

const GLOBAL_DIR = path.join(BASE_DATA, "global");
const ARCHIVE_GLOBAL_DIR = path.join(BASE_DATA, "archive", "global");

// יצירת תיקיות גלובליות אם לא קיימות
[GLOBAL_DIR, ARCHIVE_GLOBAL_DIR].forEach(dir => fs.mkdirSync(dir, { recursive: true }));

// =======================
// קבצים קבועים
// =======================

const FILES = {
  titles: "titles.txt",
  fulldata: "fulldata.txt",
  excel: "titles.xlsx",
  blacklist: "blacklist.txt"
};

// =======================
// פונקציות נתיב
// =======================

const globalFile = name => path.join(GLOBAL_DIR, name);

// =======================
// טעינת blacklist
// =======================

function loadBlacklist(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf-8")
    .split("\n")
    .map(w => w.trim())
    .filter(Boolean);
}

// =======================
// ניקוי טקסט
// =======================

function cleanText(text, blacklist) {
  let result = text;
  blacklist.forEach(word => {
    result = result.replace(new RegExp(word, "gi"), "");
  });
  return result.replace(/\s+/g, " ").trim();
}

// =======================
// ✅ תיקון: המרת תאריך עברי לפורמט אחיד
// =======================

function normalizeDate(raw) {
  if (!raw) return "";

  // מפת חודשים בעברית
  const months = {
    "ינואר": "01",
    "פברואר": "02",
    "מרץ": "03",
    "אפריל": "04",
    "מאי": "05",
    "יוני": "06",
    "יולי": "07",
    "אוגוסט": "08",
    "ספטמבר": "09",
    "אוקטובר": "10",
    "נובמבר": "11",
    "דצמבר": "12"
  };

  const clean = raw.replace(",", "").trim();

  if (clean.includes("/")) {
    // דוגמה: "17/08/2025"
    const parts = clean.split("/");
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  } else {
    // דוגמה: "03 ינואר 2026, 19:53"
    const parts = clean.split(/\s+/);
    if (parts.length >= 3) {
      const day = parts[0].padStart(2, "0");
      const monthName = parts[1];
      const year = parts[2];
      const month = months[monthName];
      if (month) {
        return `${year}-${month}-${day}`;
      }
    }
  }

  return raw;
}

// =======================
// 1️⃣ סריקה
// =======================

async function scanSite(site) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  try {
    await page.goto(site.url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    // Wait for potential dynamic content
    if (site.type === "yosmusic") {
      await page.waitForSelector(".elementor-post__card", { timeout: 15000 });
    }
    await page.waitForTimeout(5000);

    const results = await page.evaluate((siteType) => {
      let elements;
      if (siteType === "forum") {
        elements = document.querySelectorAll("tr");
      } else if (siteType === "yosmusic") {
        elements = document.querySelectorAll(".elementor-post__card");
      } else {
        return [];
      }

      console.log("Found elements:", elements.length);
      const results = [];

      elements.forEach(el => {
        console.log("Processing element:", el.textContent.substring(0, 100));
        let titleEl, url, postDate = "", desc = "";

        if (siteType === "forum") {
          titleEl = el.querySelector("a.topictitle");
          if (!titleEl) {
            console.log("No link in row");
            return;
          }
          url = titleEl.href;
          const dateCell = el.querySelector('p.topicdetails[style*="white-space"]');
          postDate = dateCell ? dateCell.textContent.trim() : "";
        } else if (siteType === "yosmusic") {
          titleEl = el.querySelector("h3.elementor-post__title a");
          if (!titleEl) {
            console.log("No title in card");
            return;
          }
          url = titleEl.href;
          const dateEl = el.querySelector("span.elementor-post-date");
          postDate = dateEl ? dateEl.textContent.trim() : "";
          const descEl = el.querySelector("div.elementor-post__excerpt p");
          desc = descEl ? descEl.textContent.trim() : "";
        }

        console.log("Found title:", titleEl.textContent.trim());

        results.push({
          title: titleEl.textContent.trim(),
          url,
          postDate,
          desc
        });
      });

      console.log("Total results:", results.length);
      return results;
    }, site.type);

    return results;
  } finally {
    await browser.close();
  }
}


// =======================
// 2️⃣ עיבוד
// =======================

function processItems(items, blacklist, existingTitles) {
  const scanDate = new Date().toISOString().slice(0, 10);

  return items
    .map(item => {
      const cleanTitle = cleanText(item.title, blacklist);
      if (!cleanTitle) return null;
      if (existingTitles.includes(cleanTitle)) return null;

      return {
        title: cleanTitle,
        url: item.url,
        postDate: normalizeDate(item.postDate),
        scanDate,
        desc: item.desc || ""
      };
    })
    .filter(Boolean);
}

// =======================
// 3️⃣ כתיבה לקבצי טקסט
// =======================

function prependLines(filePath, lines) {
  const existing = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf-8")
    : "";
  fs.writeFileSync(filePath, lines.join("\n") + "\n" + existing);
}

function writeTextFiles(newItems, fileFunc) {
  if (!newItems.length) return;

  // titles.txt
  const titles = newItems.map(i => i.title);
  prependLines(fileFunc(FILES.titles), titles);

  // fulldata.txt
  const fulldataLines = newItems.flatMap(i => [
    i.title,
    i.url,
    i.postDate,
    i.scanDate,
    i.desc,
    i.tag,
    ""
  ]);

  prependLines(fileFunc(FILES.fulldata), fulldataLines);
}

// =======================
// 4️⃣ כתיבה ל-Excel
// =======================

function writeExcel(newItems, filePath) {
  if (!newItems.length) return;

  const loadRows = file => {
    if (!fs.existsSync(file)) return [];
    const wb = XLSX.readFile(file);
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(1).map(row => [...row, "", ""]); // Add empty desc and tag for old rows
  };

  const rows = [
    ...newItems.map(i => [i.title, i.postDate, i.url, i.scanDate, i.desc, i.tag]),
    ...loadRows(filePath)
  ];

  const data = [
    ["כותרת", "תאריך פוסט", "קישור", "תאריך סריקה", "תיאור", "תגית"],
    ...rows
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!rtl"] = true;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Titles");

  XLSX.writeFile(wb, filePath);
}

// =======================
// 5️⃣ שמירת ארכיון ריצה
// =======================

function archiveRun(items, archiveDir) {
  if (!items.length) return;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  // Plain text titles
  const titles = items.map(i => i.title);
  fs.writeFileSync(
    path.join(archiveDir, `scan-${stamp}-titles.txt`),
    titles.join("\n")
  );

  // Metadata text
  const baseLines = items.flatMap(i => [
    i.title,
    i.url,
    i.postDate,
    i.scanDate,
    i.desc,
    i.tag,
    ""
  ]);
  fs.writeFileSync(
    path.join(archiveDir, `scan-${stamp}-fulldata.txt`),
    baseLines.join("\n")
  );

  // Excel
  const excelPath = path.join(archiveDir, `scan-${stamp}.xlsx`);
  const data = [
    ["כותרת", "תאריך פוסט", "קישור", "תאריך סריקה", "תיאור", "תגית"],
    ...items.map(i => [i.title, i.postDate, i.url, i.scanDate, i.desc, i.tag])
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!rtl"] = true;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Titles");
  XLSX.writeFile(wb, excelPath);
}

// =======================
// עיבוד אתר יחיד
// =======================

async function scanAndProcess(site, globalBlacklist, existingTitles) {
  const tagDir = path.join(BASE_DATA, "tags", site.tag);
  const siteDir = path.join(tagDir, "sites", site.id);
  const archiveSiteDir = path.join(tagDir, "archive", site.id);
  [tagDir, siteDir, archiveSiteDir].forEach(dir => fs.mkdirSync(dir, { recursive: true }));

  const siteFile = name => path.join(siteDir, name);

  const siteBlacklist = loadBlacklist(siteFile(FILES.blacklist));
  const scanned = await scanSite(site);
  const newItems = processItems(scanned, [...globalBlacklist, ...siteBlacklist], existingTitles);
  newItems.forEach(item => item.tag = site.tag);

  if (newItems.length) {
    writeTextFiles(newItems, siteFile);
    writeExcel(newItems, siteFile(FILES.excel));
    archiveRun(newItems, archiveSiteDir);
  }

  return newItems;
}

// =======================
// פונקציה ראשית
// =======================

async function run() {
  const globalBlacklist = loadBlacklist(globalFile(FILES.blacklist));

  const existingTitles = fs.existsSync(globalFile(FILES.titles))
    ? fs.readFileSync(globalFile(FILES.titles), "utf-8").split("\n").map(t => t.trim()).filter(Boolean)
    : [];

  // Group sites by tag
  const tagGroups = {};
  for (const site of sites) {
    if (!tagGroups[site.tag]) tagGroups[site.tag] = [];
    tagGroups[site.tag].push(site);
  }

  let allNewItems = [];

  for (const tag in tagGroups) {
    const sitesInTag = tagGroups[tag];
    let tagNewItems = [];

    for (const site of sitesInTag) {
      console.log("Starting scan:", site.name);

      const newItems = await scanAndProcess(site, globalBlacklist, existingTitles);
      tagNewItems.push(...newItems);

      console.log("New items for", site.name, ":", newItems.length);
    }

    // Write tag global
    if (tagNewItems.length) {
      const tagGlobalDir = path.join(BASE_DATA, "tags", tag, "global");
      fs.mkdirSync(tagGlobalDir, { recursive: true });
      const tagGlobalFile = name => path.join(tagGlobalDir, name);

      writeTextFiles(tagNewItems, tagGlobalFile);
      writeExcel(tagNewItems, tagGlobalFile(FILES.excel));
    }

    allNewItems.push(...tagNewItems);
  }

  console.log("Total new items:", allNewItems.length);

  if (allNewItems.length) {
    writeTextFiles(allNewItems, globalFile);
    writeExcel(allNewItems, globalFile(FILES.excel));
    archiveRun(allNewItems, ARCHIVE_GLOBAL_DIR);
  }
}

run().catch(err => {
  console.error("Scan failed:", err);
  process.exit(1);
});
