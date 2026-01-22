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
    } else if (site.type === "youtube-playlist") {
      await page.waitForSelector("ytd-playlist-video-renderer", { timeout: 15000 });
    } else if (site.type === "apple-music-playlist") {
      await page.waitForSelector(".songs-list-row", { timeout: 15000 });
    }
    await page.waitForTimeout(5000);

    console.log("Starting evaluate for siteType:", site.type);
    const results = await page.evaluate((siteType) => {
      let elements;
      if (siteType === "forum") {
        elements = document.querySelectorAll("tr");
      } else if (siteType === "yosmusic") {
        elements = document.querySelectorAll(".elementor-post__card");
      } else if (siteType === "rotter") {
        elements = document.querySelectorAll("tr");
      } else if (siteType === "youtube-playlist") {
        elements = document.querySelectorAll("ytd-playlist-video-renderer");
      } else if (siteType === "apple-music-playlist") {
        elements = document.querySelectorAll(".songs-list-row");
      } else {
        return [];
      }

      // Deduplicate elements for Apple Music playlists
      if (siteType === "apple-music-playlist") {
        const seenUrls = new Set();
        elements = Array.from(elements).filter(el => {
          const songLink = el.querySelector("a[data-testid='click-action'][href*='/song/']");
          if (songLink && songLink.href) {
            if (seenUrls.has(songLink.href)) {
              return false; // Skip duplicates
            }
            seenUrls.add(songLink.href);
            return true;
          }
          return false;
        });
      }

      console.log("Found elements:", elements.length);
      const results = [];

      elements.forEach(el => {
        try {
          console.log("Processing element:", el.textContent.substring(0, 100));
          let titleEl, url, postDate = "", desc = "", duration = "", channel = "", artistUrl = "", albumUrl = "";

          if (siteType === "forum") {
            titleEl = el.querySelector("a.topictitle");
            if (!titleEl) {
              console.log("No link in row");
              return;
            }
            title = titleEl.textContent.trim();
            url = titleEl.href;
            const dateCell = el.querySelector('p.topicdetails[style*="white-space"]');
            postDate = dateCell ? dateCell.textContent.trim() : "";
          } else if (siteType === "yosmusic") {
            titleEl = el.querySelector("h3.elementor-post__title a");
            if (!titleEl) {
              console.log("No title in card");
              return;
            }
            title = titleEl.textContent.trim();
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
            title = titleEl.textContent.trim();
            let link = titleEl.closest("a");
            if (!link) {
              console.log("No a around b");
              return;
            }
            url = link.href;
            const dateFont = el.querySelector("td font[size='1']");
            const dateText = dateFont ? dateFont.textContent.trim() : "";
            const dateParts = dateText.split(/\s+/);
            const time = dateParts.length > 1 ? dateParts[1] : "";
            const date = dateParts.length > 0 ? dateParts[0] : "";
            postDate = date;
            desc = time;
          } else if (siteType === "youtube-playlist") {
            const titleLink = el.querySelector("a#video-title");
            if (!titleLink) {
              console.log("No video title in playlist item");
              return;
            }
            const titleText = titleLink.textContent;
            if (!titleText) {
              console.log("No titleText");
              return;
            }
            title = titleText.trim();
            const fullUrl = titleLink.href;
            url = fullUrl ? fullUrl.split('&')[0] : ""; // keep only /watch?v=...

            const durationBadge = el.querySelector(".yt-badge-shape__text");
            duration = durationBadge && durationBadge.textContent ? durationBadge.textContent.trim() : "";

            const channelLink = el.querySelector("#text-container a");
            channel = channelLink && channelLink.textContent ? channelLink.textContent.trim() : "";

            const metaBlock = el.querySelector("yt-formatted-string#video-info");
            const publishTime = metaBlock && metaBlock.textContent ? metaBlock.textContent.trim().split(' • ')[1] : "";

            desc = publishTime;
            postDate = publishTime;
          } else if (siteType === "apple-music-playlist") {
            const songLink = el.querySelector("a[href*='/song/']");
            if (!songLink) {
              console.log("No song link in row");
              return;
            }
            title = songLink.textContent.trim();
            url = songLink.href;

            const artistLink = el.querySelector("a[href*='/artist/']");
            channel = artistLink ? artistLink.textContent.trim() : "";
            artistUrl = artistLink ? artistLink.href : "";

            const albumLink = el.querySelector("a[href*='/album/']");
            desc = albumLink ? albumLink.textContent.trim() : "";
            albumUrl = albumLink ? albumLink.href : "";

            const durationEl = el.querySelector("time[data-testid='track-duration']");
            duration = durationEl ? durationEl.textContent.trim() : "";

            postDate = "";
          }

          console.log("Found title:", title);

          results.push({
            title,
            url,
            postDate,
            desc,
            duration,
            channel,
            artistUrl,
            albumUrl
          });
        } catch (e) {
          console.log("Error processing element:", e.message);
        }
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
