const { cleanText, normalizeDate } = require("./utils");

// =======================
// 2️⃣ עיבוד
// =======================

function processItems(items, blacklist, existingTitles) {
  const scanDate = new Date().toISOString().slice(0, 10);

  // Track seen URLs to prevent duplicates
  const seenUrls = new Set();

  return items
    .map(item => {
      const cleanTitle = cleanText(item.title, blacklist);
      if (!cleanTitle) return null;
      if (existingTitles.includes(cleanTitle)) return null;
      if (seenUrls.has(item.url)) return null; // Skip duplicates
      seenUrls.add(item.url);

      return {
        title: cleanTitle,
        url: item.url,
        postDate: normalizeDate(item.postDate),
        scanDate,
        desc: item.desc || "",
        duration: item.duration || "",
        channel: item.channel || "",
        artistUrl: item.artistUrl || "",
        albumUrl: item.albumUrl || ""
      };
    })
    .filter(Boolean);
}

module.exports = { processItems };
