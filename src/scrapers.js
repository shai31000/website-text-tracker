const puppeteer = require("puppeteer");

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
      } else if (siteType === "rotter") {
        elements = document.querySelectorAll("tr");
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
        } else if (siteType === "rotter") {
          const bgcolor = el.getAttribute("bgcolor");
          if (bgcolor !== "#FCF8F2") {
            return; // skip header and pinned posts
          }
          titleEl = el.querySelector("b");
          if (!titleEl) {
            console.log("No b in row");
            return;
          }
          let link = titleEl.closest("a");
          if (!link) {
            console.log("No a around b");
            return;
          }
          url = link.href;
          const dateFont = el.querySelector("td font[size='1']");
          postDate = dateFont ? dateFont.textContent.trim().split(' ')[0] : "";
          desc = "";
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

module.exports = { scanSite };
