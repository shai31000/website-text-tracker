const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

/**
 * כתיבת קובץ טקסט עם prepend (חדשים למעלה)
 * @param {string} filePath
 * @param {Array<string>} lines
 */
function writeTextFile(filePath, lines) {
  const existing = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf-8")
    : "";
  fs.writeFileSync(filePath, lines.join("\n") + "\n" + existing);
}

/**
 * כתיבת קובץ טקסט עם מטא (title\nurl\npostDate\nscanDate\n\n)
 * @param {string} filePath
 * @param {Array} items
 */
function writeMetaTextFile(filePath, items) {
  const lines = items.flatMap(item => [
    item.title,
    item.url,
    item.postDate,
    item.scanDate,
    ""
  ]);
  writeTextFile(filePath, lines);
}

/**
 * כתיבת אקסל עם RTL
 * @param {string} filePath
 * @param {Array} data - rows
 * @param {Array<string>} headers
 */
function writeExcelFile(filePath, data, headers) {
  const ws_data = [headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  ws["!rtl"] = true;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");

  XLSX.writeFile(wb, filePath);
}

/**
 * הוספה לקבצי אגרגציה (כלל, סינגלים, אלבומים)
 * @param {string} baseDir
 * @param {Array} allItems
 * @param {Array} singlesItems
 * @param {Array} albumsItems
 */
function appendToAggregates(baseDir, allItems, singlesItems, albumsItems) {
  const scanDate = new Date().toISOString().slice(0, 10);

  // All
  if (allItems.length) {
    const allTitles = allItems.map(i => i.title);
    writeTextFile(path.join(baseDir, "all", "all_scans.txt"), allTitles);

    writeMetaTextFile(path.join(baseDir, "all", "all_scans_meta.txt"), allItems);

    // Excel
    const existingAll = loadExcelRows(path.join(baseDir, "all", "all_scans.xlsx"));
    const newRows = [...allItems.map(i => [i.title, i.postDate, i.url, i.scanDate]), ...existingAll];
    writeExcelFile(path.join(baseDir, "all", "all_scans.xlsx"), newRows, ["כותרת", "תאריך פוסט", "קישור", "תאריך סריקה"]);
  }

  // Singles
  if (singlesItems.length) {
    const singlesTitles = singlesItems.map(i => i.title);
    writeTextFile(path.join(baseDir, "singles", "singles_all.txt"), singlesTitles);
    writeMetaTextFile(path.join(baseDir, "singles", "singles_all_meta.txt"), singlesItems);

    const existingSingles = loadExcelRows(path.join(baseDir, "singles", "singles_all.xlsx"));
    const newSinglesRows = [...singlesItems.map(i => [i.title, i.postDate, i.url, i.scanDate]), ...existingSingles];
    writeExcelFile(path.join(baseDir, "singles", "singles_all.xlsx"), newSinglesRows, ["כותרת", "תאריך פוסט", "קישור", "תאריך סריקה"]);
  }

  // Albums
  if (albumsItems.length) {
    const albumsTitles = albumsItems.map(i => i.title);
    writeTextFile(path.join(baseDir, "albums", "albums_all.txt"), albumsTitles);
    writeMetaTextFile(path.join(baseDir, "albums", "albums_all_meta.txt"), albumsItems);

    const existingAlbums = loadExcelRows(path.join(baseDir, "albums", "albums_all.xlsx"));
    const newAlbumsRows = [...albumsItems.map(i => [i.title, i.postDate, i.url, i.scanDate]), ...existingAlbums];
    writeExcelFile(path.join(baseDir, "albums", "albums_all.xlsx"), newAlbumsRows, ["כותרת", "תאריך פוסט", "קישור", "תאריך סריקה"]);
  }
}

/**
 * כתיבת פלטים ספציפיים לעמוד
 * @param {string} baseDir
 * @param {string} pageId
 * @param {Array} items
 */
function writePageFiles(baseDir, pageId, items) {
  if (!items.length) return;

  const pageDir = path.join(baseDir, "pages", pageId);
  fs.mkdirSync(pageDir, { recursive: true });

  const titles = items.map(i => i.title);
  writeTextFile(path.join(pageDir, "page_scans.txt"), titles);
  writeMetaTextFile(path.join(pageDir, "page_scans_meta.txt"), items);

  const existingPage = loadExcelRows(path.join(pageDir, "page_scans.xlsx"));
  const newPageRows = [...items.map(i => [i.title, i.postDate, i.url, i.scanDate]), ...existingPage];
  writeExcelFile(path.join(pageDir, "page_scans.xlsx"), newPageRows, ["כותרת", "תאריך פוסט", "קישור", "תאריך סריקה"]);
}

/**
 * יצירת ארכיון ריצה
 * @param {string} archiveDir
 * @param {string} runTimestamp
 * @param {Array} allItems
 * @param {Array} singlesItems
 * @param {Array} albumsItems
 * @param {Object} pageItemsMap - {pageId: items}
 */
function archiveRun(archiveDir, runTimestamp, allItems, singlesItems, albumsItems, pageItemsMap) {
  const runDir = path.join(archiveDir, "runs", runTimestamp);
  fs.mkdirSync(runDir, { recursive: true });

  // All
  if (allItems.length) {
    writeTextFile(path.join(runDir, "all_scans.txt"), allItems.map(i => i.title));
    writeMetaTextFile(path.join(runDir, "all_scans_meta.txt"), allItems);
    writeExcelFile(path.join(runDir, "all_scans.xlsx"), allItems.map(i => [i.title, i.postDate, i.url, i.scanDate]), ["כותרת", "תאריך פוסט", "קישור", "תאריך סריקה"]);
  }

  // Singles
  if (singlesItems.length) {
    writeTextFile(path.join(runDir, "singles_scans.txt"), singlesItems.map(i => i.title));
    writeMetaTextFile(path.join(runDir, "singles_scans_meta.txt"), singlesItems);
    writeExcelFile(path.join(runDir, "singles_scans.xlsx"), singlesItems.map(i => [i.title, i.postDate, i.url, i.scanDate]), ["כותרת", "תאריך פוסט", "קישור", "תאריך סריקה"]);
  }

  // Albums
  if (albumsItems.length) {
    writeTextFile(path.join(runDir, "albums_scans.txt"), albumsItems.map(i => i.title));
    writeMetaTextFile(path.join(runDir, "albums_scans_meta.txt"), albumsItems);
    writeExcelFile(path.join(runDir, "albums_scans.xlsx"), albumsItems.map(i => [i.title, i.postDate, i.url, i.scanDate]), ["כותרת", "תאריך פוסט", "קישור", "תאריך סריקה"]);
  }

  // Pages
  for (const [pageId, items] of Object.entries(pageItemsMap)) {
    const pageArchiveDir = path.join(runDir, "pages", pageId);
    fs.mkdirSync(pageArchiveDir, { recursive: true });

    writeTextFile(path.join(pageArchiveDir, "page_scans.txt"), items.map(i => i.title));
    writeMetaTextFile(path.join(pageArchiveDir, "page_scans_meta.txt"), items);
    writeExcelFile(path.join(pageArchiveDir, "page_scans.xlsx"), items.map(i => [i.title, i.postDate, i.url, i.scanDate]), ["כותרת", "תאריך פוסט", "קישור", "תאריך סריקה"]);
  }
}

/**
 * טעינת שורות אקסל קיימות
 * @param {string} filePath
 * @returns {Array<Array>}
 */
function loadExcelRows(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(1);
}

module.exports = { writeTextFile, writeMetaTextFile, writeExcelFile, appendToAggregates, writePageFiles, archiveRun };