const fs = require("fs");
const path = require("path");
const { scanPage } = require("./modules/scanner");
const { loadBlacklist, processItems } = require("./modules/processor");
const { appendToAggregates, writePageFiles, archiveRun } = require("./modules/writer");
const config = require("./config");

// תיקיות
const BASE_DATA = path.join(__dirname, "..", "data");
const BLACKLISTS_DIR = path.join(BASE_DATA, "blacklists");
const OUTPUTS_DIR = path.join(BASE_DATA, "outputs");
const ARCHIVE_DIR = path.join(BASE_DATA, "archive");

// יצירת תיקיות אם לא קיימות
[BLACKLISTS_DIR, OUTPUTS_DIR, ARCHIVE_DIR].forEach(dir => fs.mkdirSync(dir, { recursive: true }));

async function main() {
  const scanDate = new Date().toISOString().slice(0, 10);
  const runTimestamp = new Date().toISOString().replace(/[:.]/g, "-");

  console.log(`[Main] Starting scan run at ${runTimestamp}`);

  // טעינת רשימת שחורה כללית
  const globalBlacklist = loadBlacklist(path.join(BLACKLISTS_DIR, "global_blacklist.txt"));
  console.log(`[Main] Loaded ${globalBlacklist.length} global blacklist words`);

  // טעינת existing titles
  const loadExistingTitles = (type) => {
    const filePath = path.join(OUTPUTS_DIR, type, `${type}_all.txt`);
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8").split("\n").filter(Boolean) : [];
  };
  const existingAllTitles = loadExistingTitles("all");
  const existingSinglesTitles = loadExistingTitles("singles");
  const existingAlbumsTitles = loadExistingTitles("albums");

  console.log(`[Main] Existing titles: all=${existingAllTitles.length}, singles=${existingSinglesTitles.length}, albums=${existingAlbumsTitles.length}`);

  // סריקה מקבילה של כל העמודים
  const pagePromises = config.pages.map(async (page) => {
    const rawItems = await scanPage(page);
    const pageBlacklist = loadBlacklist(path.join(BLACKLISTS_DIR, `${page.id}_blacklist.txt`));

    let existingForType = [];
    if (page.type === "singles") existingForType = existingSinglesTitles;
    else if (page.type === "albums") existingForType = existingAlbumsTitles;

    const newItems = processItems(rawItems, globalBlacklist, pageBlacklist, existingForType, scanDate);
    console.log(`[Main] ${page.id}: ${newItems.length} new items`);

    return { page, items: newItems };
  });

  const results = await Promise.all(pagePromises);

  // איסוף לפי type
  const allItems = [];
  const singlesItems = [];
  const albumsItems = [];
  const pageItemsMap = {};

  results.forEach(({ page, items }) => {
    if (items.length) {
      allItems.push(...items);
      if (page.type === "singles") singlesItems.push(...items);
      else if (page.type === "albums") albumsItems.push(...items);

      pageItemsMap[page.id] = items;
    }
  });

  console.log(`[Main] Total new items: all=${allItems.length}, singles=${singlesItems.length}, albums=${albumsItems.length}`);

  // כתיבה לפלטים
  if (allItems.length) appendToAggregates(OUTPUTS_DIR, allItems, singlesItems, albumsItems);

  for (const [pageId, items] of Object.entries(pageItemsMap)) {
    writePageFiles(OUTPUTS_DIR, pageId, items);
  }

  // יצירת ארכיון
  archiveRun(ARCHIVE_DIR, runTimestamp, allItems, singlesItems, albumsItems, pageItemsMap);

  console.log(`[Main] Scan complete. Archived to ${runTimestamp}`);
}

main().catch(err => {
  console.error("[Main] Scan failed:", err);
  process.exit(1);
});