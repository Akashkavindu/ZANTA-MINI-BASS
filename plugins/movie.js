const { cmd } = require("../command");
const puppeteer = require("puppeteer");

// මැමරි එකේ දත්ත තියාගන්න (Restart වුණොත් මේවා මැකෙනවා)
const pendingSearch = {};
const pendingQuality = {};

function normalizeQuality(text) {
    if (!text) return null;
    text = text.toUpperCase();
    if (/1080|FHD/.test(text)) return "1080p";
    if (/720|HD/.test(text)) return "720p";
    if (/480|SD/.test(text)) return "480p";
    return text;
}

function getDirectPixeldrainUrl(url) {
    const match = url.match(/pixeldrain\.com\/u\/(\w+)/);
    if (!match) return null;
    return `https://pixeldrain.com/api/file/${match[1]}?download`;
}

async function searchMovies(query) {
    const searchUrl = `https://sinhalasub.lk/?s=${encodeURIComponent(query)}`;
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36");

    try {
        // සයිට් එක ස්ලෝ නිසා timeout එක වැඩි කළා
        await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 60000 });
        
        const results = await page.evaluate(() => {
            const boxes = document.querySelectorAll(".display-item .item-box");
            return Array.from(boxes).map((box, index) => {
                const a = box.querySelector("a");
                const img = box.querySelector("img");
                const lang = box.querySelector(".language")?.textContent || "";
                const quality = box.querySelector(".quality")?.textContent || "";
                return {
                    id: index + 1,
                    title: a?.title?.trim() || box.querySelector("h3")?.textContent?.trim() || "",
                    movieUrl: a?.href || "",
                    thumb: img?.src || "",
                    language: lang.trim(),
                    quality: quality.trim(),
                };
            }).filter(m => m.title && m.movieUrl);
        });
        await browser.close();
        return results;
    } catch (e) {
        console.error("Search Error:", e);
        await browser.close();
        return [];
    }
}

async function getMovieMetadata(url) {
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36");
    
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    const metadata = await page.evaluate(() => {
        const getText = el => el?.textContent.trim() || "";
        const title = getText(document.querySelector(".info-details .details-title h3"));
        let language = "", duration = "", imdb = "", genres = [], directors = [], stars = [];
        
        document.querySelectorAll(".info-col p").forEach(p => {
            const txt = p.textContent.trim();
            if (txt.includes("Language:")) language = txt.replace("Language:", "").trim();
            if (txt.includes("Director:")) directors = Array.from(p.querySelectorAll("a")).map(a => a.textContent.trim());
            if (txt.includes("Stars:")) stars = Array.from(p.querySelectorAll("a")).map(a => a.textContent.trim());
        });
        
        duration = getText(document.querySelector(".info-details .data-views[itemprop='duration']"));
        imdb = getText(document.querySelector(".info-details .data-imdb"))?.replace("IMDb:", "").trim();
        genres = Array.from(document.querySelectorAll(".details-genre a")).map(el => el.textContent.trim());
        const thumbnail = document.querySelector(".splash-bg img")?.src || "";
        
        return { title, language, duration, imdb, genres, directors, stars, thumbnail };
    });
    await browser.close();
    return metadata;
}

async function getPixeldrainLinks(movieUrl) {
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36");
    
    await page.goto(movieUrl, { waitUntil: "networkidle2", timeout: 60000 });
    const linksData = await page.$$eval(".link-pixeldrain tbody tr", rows =>
        rows.map(row => {
            const a = row.querySelector(".link-opt a");
            const quality = row.querySelector(".quality")?.textContent.trim() || "";
            const size = row.querySelectorAll("td")[2]?.textContent.trim() || "";
            return { pageLink: a?.href || "", quality, size };
        }).filter(l => l.pageLink)
    );
    
    const directLinks = [];
    for (const l of linksData) {
        try {
            const subPage = await browser.newPage();
            await subPage.goto(l.pageLink, { waitUntil: "networkidle2", timeout: 45000 });
            await new Promise(r => setTimeout(r, 13000)); // Sinhalasub countdown එකට
            const finalUrl = await subPage.$eval(".wait-done a[href^='https://pixeldrain.com/']", el => el.href).catch(() => null);
            if (finalUrl) {
                directLinks.push({ link: finalUrl, quality: quality = l.quality, size: l.size });
            }
            await subPage.close();
        } catch (e) { continue; }
    }
    await browser.close();
    return directLinks;
}

// --- MAIN SEARCH COMMAND ---
cmd({
    pattern: "movie",
    alias: ["sinhalasub", "cinema"],
    react: "🎬",
    category: "download",
    filename: __filename
}, async (bot, mek, m, { from, q, sender, reply }) => {
    if (!q) return reply("🎼 *කරුණාකර චිත්‍රපටයක නමක් ලබා දෙන්න.* (උදා: .movie Jumanji)");
    
    reply("*🔍 Searching for movies...*");
    const results = await searchMovies(q);
    
    if (!results || results.length === 0) return reply("❌ *ප්‍රතිඵල හමු නොවීය.*");

    pendingSearch[sender] = { results, timestamp: Date.now() };

    let listMsg = `🎬 *ᴢᴀɴᴛᴀ-ᴍᴅ ᴍᴏᴠɪᴇ sᴇᴀʀᴄʜ*\n\n`;
    results.forEach((res, i) => {
        listMsg += `*${i + 1}.* ${res.title}\n   🎭 ${res.language} | 📊 ${res.quality}\n\n`;
    });
    listMsg += `> *Reply සමඟ අංකය ලබා දෙන්න.*`;

    await bot.sendMessage(from, { text: listMsg }, { quoted: mek });
});

// --- REPLY LISTENER ---
cmd({
    on: "text"
}, async (bot, mek, m, { from, body, sender, reply }) => {
    const text = body.trim();
    
    // 1. Movie එකක් තෝරාගත් විට (pendingSearch)
    if (pendingSearch[sender] && !isNaN(text) && parseInt(text) > 0 && parseInt(text) <= pendingSearch[sender].results.length) {
        const index = parseInt(text) - 1;
        const selected = pendingSearch[sender].results[index];
        delete pendingSearch[sender];

        reply(`*🎬 Fetching info for:* ${selected.title}...`);
        const metadata = await getMovieMetadata(selected.movieUrl);
        
        let info = `✨ *${metadata.title}* ✨\n\n`;
        info += `🗓️ *Duration:* ${metadata.duration}\n⭐ *IMDb:* ${metadata.imdb}\n🌍 *Language:* ${metadata.language}\n🎭 *Genres:* ${metadata.genres.join(", ")}\n\n`;
        info += `*🔗 Generating Download Links...*`;

        if (metadata.thumbnail) {
            await bot.sendMessage(from, { image: { url: metadata.thumbnail }, caption: info }, { quoted: mek });
        } else {
            reply(info);
        }

        const links = await getPixeldrainLinks(selected.movieUrl);
        if (!links || links.length === 0) return reply("❌ *බාගත කිරීමේ ලින්ක් හමු නොවීය.*");

        pendingQuality[sender] = { metadata, links, timestamp: Date.now() };

        let qMsg = `📥 *ᴀᴠᴀɪʟᴀʙʟᴇ ǫᴜᴀʟɪᴛɪᴇs*\n\n`;
        links.forEach((l, i) => {
            qMsg += `*${i + 1}.* ${l.quality} (${l.size})\n`;
        });
        qMsg += `\n> *අවශ්‍ය quality එකේ අංකය Reply කරන්න.*`;
        
        return reply(qMsg);
    }

    // 2. Quality එකක් තෝරාගත් විට (pendingQuality)
    if (pendingQuality[sender] && !isNaN(text) && parseInt(text) > 0 && parseInt(text) <= pendingQuality[sender].links.length) {
        const qIndex = parseInt(text) - 1;
        const selectedLink = pendingQuality[sender].links[qIndex];
        const meta = pendingQuality[sender].metadata;
        delete pendingQuality[sender];

        reply(`*⬇️ Sending ${selectedLink.quality} Movie...*`);

        try {
            const downloadUrl = getDirectPixeldrainUrl(selectedLink.link);
            await bot.sendMessage(from, {
                document: { url: downloadUrl },
                mimetype: "video/mp4",
                fileName: `${meta.title}.mp4`,
                caption: `🎬 *${meta.title}*\n📊 *Quality:* ${selectedLink.quality}\n⚖️ *Size:* ${selectedLink.size}\n\n> *ᴘᴏවෙරෙᴅ ʙʏ ᴢᴀɴᴛᴀ-ᴍᴅ*`
            }, { quoted: mek });
        } catch (err) {
            reply("❌ *සොරි, ෆයිල් එක එවීමේ දෝෂයක්:* " + err.message);
        }
    }
});

module.exports = { pendingSearch, pendingQuality };
