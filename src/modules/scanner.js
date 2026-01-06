const puppeteer = require("puppeteer");

/**
 * סורק עמוד יחיד ומחזיר מערך של items
 * @param {Object} pageConfig - הגדרות העמוד (id, url, etc.)
 * @returns {Promise<Array>} מערך של אובייקטים עם title, url, postDate
 */
async function scanPage(pageConfig) {
  console.log(`[Scanner] Starting scan for ${pageConfig.id} (${pageConfig.name})`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();

    await page.goto(pageConfig.url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    const items = await page.$$eval("tr", rows => {
      const results = [];

      rows.forEach(row => {
        const link = row.querySelector("a.topictitle");
        if (!link) return;

        const dateCell = row.querySelector(
          'p.topicdetails[style*="white-space"]'
        );

        results.push({
          title: link.textContent.trim(),
          url: link.href,
          postDate: dateCell ? dateCell.textContent.trim() : ""
        });
      });

      return results;
    });

    console.log(`[Scanner] Found ${items.length} items for ${pageConfig.id}`);
    return items;
  } catch (error) {
    console.error(`[Scanner] Error scanning ${pageConfig.id}:`, error.message);
    return []; // החזר מערך ריק כדי לא לקרוס את התהליך
  } finally {
    await browser.close();
  }
}

module.exports = { scanPage };