const { cmd } = require("../command");
const yts = require("yt-search");

// Search results mathaka thaba ganna temporary Map ekak
const ytsLinks = new Map();

cmd({
    pattern: "yts",
    alias: ["ytsearch"],
    react: "🔎",
    category: "search",
    filename: __filename,
}, async (zanta, mek, m, { from, reply, q, userSettings }) => {
    try {
        if (!q) return reply("🔍 *Mona wageda hoyanna ona?*");

        const loading = await zanta.sendMessage(from, { text: "⌛ *Searching...*" }, { quoted: mek });
        const search = await yts(q);
        const results = search.videos.slice(0, 10);

        if (!results.length) return await zanta.sendMessage(from, { text: "❌ No results.", edit: loading.key });

        let resultText = `🎬 *YT SEARCH RESULTS*\n\n`;
        let linksArray = [];

        results.forEach((v, i) => {
            resultText += `*${i + 1}.* ${v.title}\n   ⌚ ${v.timestamp} | 🔗 Reply *${i + 1}*\n\n`;
            linksArray.push({ url: v.url, title: v.title, seconds: v.seconds });
        });

        resultText += `> *Reply with number to download Video*`;

        const sentMsg = await zanta.sendMessage(from, {
            image: { url: results[0].thumbnail },
            caption: resultText
        }, { quoted: mek });

        // Search ID eka anuwa links tika temporary save karanawa (expire in 10 mins)
        ytsLinks.set(sentMsg.key.id, linksArray);
        setTimeout(() => ytsLinks.delete(sentMsg.key.id), 10 * 60 * 1000);

        await zanta.sendMessage(from, { delete: loading.key });

    } catch (err) {
        reply("❌ Error.");
    }
});

module.exports = { ytsLinks }; // Meka reply handler ekata ona wenawa
