/**
 * SCAN.JS - Main entry point
 * Orchestrates the scanning process
 */

const fs = require("fs");
const path = require("path");

const { loadBlacklist } = require("./utils");
const { scanSite } = require("./scrapers");
const { processItems } = require("./processors");
const { FILES, writeTextFiles, writeExcel, archiveRun } = require("./writers");

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
// פונקציות נתיב
// =======================

const globalFile = name => path.join(GLOBAL_DIR, name);

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
    writeTextFilesWeekly(newItems, siteDir);
    writeExcel(newItems, siteFile(FILES.excel));
    writeExcelWeekly(newItems, siteDir);
    archiveRun(newItems, archiveSiteDir);
    archiveRunWeekly(newItems, archiveSiteDir);
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
      writeTextFilesWeekly(tagNewItems, tagGlobalDir);
      writeExcel(tagNewItems, tagGlobalFile(FILES.excel));
      writeExcelWeekly(tagNewItems, tagGlobalDir);
    }

    allNewItems.push(...tagNewItems);
  }

  console.log("Total new items:", allNewItems.length);

  if (allNewItems.length) {
    writeTextFiles(allNewItems, globalFile);
    writeTextFilesWeekly(allNewItems, GLOBAL_DIR);
    writeExcel(allNewItems, globalFile(FILES.excel));
    writeExcelWeekly(allNewItems, GLOBAL_DIR);
    archiveRun(allNewItems, ARCHIVE_GLOBAL_DIR);
    archiveRunWeekly(allNewItems, ARCHIVE_GLOBAL_DIR);
  }
}

run().catch(err => {
  console.error("Scan failed:", err);
  process.exit(1);
});
