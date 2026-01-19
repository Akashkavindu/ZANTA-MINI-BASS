const { cmd } = require("../command");
const axios = require("axios");
const cheerio = require("cheerio");

const pendingSearch = {};
const pendingQuality = {};

// --- 🛠️ HELPERS ---
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

const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
};

// --- 🔍 FUNCTIONS ---

async function searchMovies(query) {
    try {
        const searchUrl = `https://sinhalasub.lk/?s=${encodeURIComponent(query)}&post_type=movies`;
        const { data } = await axios.get(searchUrl, { headers });
        const $ = cheerio.load(data);
        const results = [];

        $(".display-item .item-box").slice(0, 10).each((i, el) => {
            const a = $(el).find("a");
            const img = $(el).find(".thumb");
            const lang = $(el).find(".item-desc-giha .language").text().trim();
            const quality = $(el).find(".item-desc-giha .quality").text().trim();
            const qty = $(el).find(".item-desc-giha .qty").text().trim();

            if (a.attr("title") && a.attr("href")) {
                results.push({
                    id: i + 1,
                    title: a.attr("title").trim(),
                    movieUrl: a.attr("href"),
                    thumb: img.attr("src"),
                    language: lang,
                    quality: quality,
                    qty: qty
                });
            }
        });
        return results;
    } catch (e) {
        console.error("Search Error:", e);
        return [];
    }
}

async function getMovieMetadata(url) {
    try {
        const { data } = await axios.get(url, { headers });
        const $ = cheerio.load(data);

        const title = $(".info-details .details-title h3").text().trim();
        const duration = $(".info-details .data-views[itemprop='duration']").text().trim();
        const imdb = $(".info-details .data-imdb").text().replace("IMDb:", "").trim();
        const thumbnail = $(".splash-bg img").attr("src");

        const genres = [];
        $(".details-genre a").each((i, el) => genres.push($(el).text().trim()));

        let language = "";
        const directors = [];
        const stars = [];

        $(".info-col p").each((i, el) => {
            const txt = $(el).find("strong").text();
            if (txt.includes("Language:")) language = $(el).text().replace("Language:", "").trim();
            if (txt.includes("Director:")) {
                $(el).find("a").each((i, a) => directors.push($(a).text().trim()));
            }
            if (txt.includes("Stars:")) {
                $(el).find("a").each((i, a) => stars.push($(a).text().trim()));
            }
        });

        return { title, language, duration, imdb, genres, directors, stars, thumbnail };
    } catch (e) {
        console.error("Metadata Error:", e);
        return null;
    }
}

async function getPixeldrainLinks(movieUrl) {
    try {
        const { data } = await axios.get(movieUrl, { headers });
        const $ = cheerio.load(data);
        const directLinks = [];

        // Pixeldrain ටේබල් එකෙන් ලින්ක් ගන්නවා
        const rows = $(".link-pixeldrain tbody tr");

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const pageLink = $(row).find(".link-opt a").attr("href");
            const qualityText = $(row).find(".quality").text().trim();
            const sizeText = $(row).find("td:nth-child(3) span").text().trim().toUpperCase();

            if (pageLink) {
                // සයිට් එකේ තියෙන අතරමැදි ලින්ක් එකෙන් කෙලින්ම Pixeldrain ලින්ක් එක ගන්න හැටි
                // සටහන: සමහරවිට මේකට පොඩි delay එකක් සයිට් එකෙන් දානවා, නමුත් Axios වලින් වේගයෙන් ට්‍රයි කරන්න පුළුවන්
                try {
                    const subPage = await axios.get(pageLink, { headers });
                    const $$ = cheerio.load(subPage.data);
                    const finalUrl = $$(".wait-done a[href^='https://pixeldrain.com/']").attr("href");

                    if (finalUrl) {
                        let sizeMB = 0;
                        if (sizeText.includes("GB")) sizeMB = parseFloat(sizeText) * 1024;
                        else if (sizeText.includes("MB")) sizeMB = parseFloat(sizeText);

                        if (sizeMB <= 2048) { // 2GB වලට අඩු ඒක විතරයි
                            directLinks.push({ 
                                link: finalUrl, 
                                quality: normalizeQuality(qualityText), 
                                size: sizeText 
                            });
                        }
                    }
                } catch (err) { continue; }
            }
        }
        return directLinks;
    } catch (e) {
        console.error("Link Fetch Error:", e);
        return [];
    }
}

// --- 🎬 COMMAND HANDLERS ---

cmd({
    pattern: "movie",
    alias: ["sinhalasub", "films", "cinema"],
    react: "🎬",
    desc: "Search movies from Sinhalasub.lk",
    category: "download",
    filename: __filename
}, async (danuwa, mek, m, { from, q, sender, reply }) => {
    if (!q) return reply(`*🎬 Movie Search Plugin*\nUsage: .movie <name>\nExample: .movie avengers`);
    reply("*🔍 Searching for movies...*");

    const searchResults = await searchMovies(q);
    if (!searchResults || !searchResults.length) return reply("*❌ No movies found!*");

    pendingSearch[sender] = { results: searchResults, timestamp: Date.now() };

    let text = `*🎬 Search Results for: ${q}*\n\n`;
    searchResults.forEach((m, i) => {
        text += `*${i + 1}.* ${m.title}\n   📝 ${m.language} | 📊 ${m.quality}\n\n`;
    });
    text += `*Reply with movie number (1-${searchResults.length})*`;
    reply(text);
});

cmd({
    filter: (text, { sender }) => pendingSearch[sender] && !isNaN(text) && parseInt(text) > 0 && parseInt(text) <= pendingSearch[sender].results.length
}, async (danuwa, mek, m, { body, sender, reply, from }) => {
    await danuwa.sendMessage(from, { react: { text: "✅", key: m.key } });
    const index = parseInt(body.trim()) - 1;
    const selected = pendingSearch[sender].results[index];
    delete pendingSearch[sender];

    const metadata = await getMovieMetadata(selected.movieUrl);
    if (!metadata) return reply("❌ තොරතුරු ලබා ගැනීමට නොහැකි විය.");

    let msg = `*🎬 ${metadata.title}*\n\n`;
    msg += `*⭐ IMDb:* ${metadata.imdb}\n*⏱️ Duration:* ${metadata.duration}\n*📝 Language:* ${metadata.language}\n`;
    msg += `*🎭 Genres:* ${metadata.genres.join(", ")}\n\n`;
    msg += "*🔗 Fetching download links, please wait...*";

    if (metadata.thumbnail) {
        await danuwa.sendMessage(from, { image: { url: metadata.thumbnail }, caption: msg }, { quoted: mek });
    } else {
        await danuwa.sendMessage(from, { text: msg }, { quoted: mek });
    }

    const downloadLinks = await getPixeldrainLinks(selected.movieUrl);
    if (!downloadLinks.length) return reply("*❌ No Pixeldrain links found (<2GB)!*");

    pendingQuality[sender] = { movie: { metadata, downloadLinks }, timestamp: Date.now() };
    let qualityMsg = "*📥 Available Qualities (Max 2GB):*\n\n";
    downloadLinks.forEach((d, i) => qualityMsg += `*${i + 1}.* ${d.quality} - ${d.size}\n`);
    qualityMsg += `\n*Reply with quality number to receive the movie.*`;
    await danuwa.sendMessage(from, { text: qualityMsg }, { quoted: mek });
});

cmd({
    filter: (text, { sender }) => pendingQuality[sender] && !isNaN(text) && parseInt(text) > 0 && parseInt(text) <= pendingQuality[sender].movie.downloadLinks.length
}, async (danuwa, mek, m, { body, sender, reply, from }) => {
    await danuwa.sendMessage(from, { react: { text: "✅", key: m.key } });
    const index = parseInt(body.trim()) - 1;
    const { movie } = pendingQuality[sender];
    delete pendingQuality[sender];

    const selectedLink = movie.downloadLinks[index];
    reply(`*⬇️ Sending ${selectedLink.quality} movie as document...*\nPlease wait.`);

    try {
        const directUrl = getDirectPixeldrainUrl(selectedLink.link);
        await danuwa.sendMessage(from, {
            document: { url: directUrl },
            mimetype: "video/mp4",
            fileName: `${movie.metadata.title.substring(0, 40)}_${selectedLink.quality}.mp4`.replace(/\s+/g, '_').replace(/[^\w.-]/gi, ''),
            caption: `*🎬 ${movie.metadata.title}*\n*📊 Quality:* ${selectedLink.quality}\n*💾 Size:* ${selectedLink.size}\n\n*Enjoy! 🍿*`
        }, { quoted: mek });
    } catch (error) {
        reply(`*❌ Failed to send:* ${error.message}`);
    }
});

// Cleanup
setInterval(() => {
    const now = Date.now();
    for (const s in pendingSearch) if (now - pendingSearch[s].timestamp > 600000) delete pendingSearch[s];
    for (const s in pendingQuality) if (now - pendingQuality[s].timestamp > 600000) delete pendingQuality[s];
}, 300000);

module.exports = { pendingSearch, pendingQuality };
