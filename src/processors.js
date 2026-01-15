const { cleanText, normalizeDate } = require("./utils");

// =======================
// 2️⃣ עיבוד
// =======================

function processItems(items, blacklist, existingTitles) {
  const scanDate = new Date().toISOString().slice(0, 10);

  return items
    .map(item => {
      const cleanTitle = cleanText(item.title, blacklist);
      if (!cleanTitle) return null;
      // if (existingTitles.includes(cleanTitle)) return null; // temporarily disabled

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
