const { cmd } = require("../command");
const yts = require("yt-search");
const { ytmp3 } = require("@vreden/youtube_scraper");
const config = require("../config");

cmd({
    pattern: "song",
    react: "🎶",
    desc: "Download MP3 Songs using direct streaming.",
    category: "download",
    filename: __filename,
}, async (zanta, mek, m, { from, reply, q, userSettings }) => {
    try {
        if (!q) return reply("❌ *කරුණාකර සින්දුවේ නම හෝ YouTube ලින්ක් එක ලබා දෙන්න.*");

        const loading = await zanta.sendMessage(from, { text: "🔍 *Searching...*" }, { quoted: mek });

        const search = await yts(q);
        const data = search.videos[0];
        if (!data) return await zanta.sendMessage(from, { text: "❌ *සින්දුව සොයාගත නොහැකි විය.*", edit: loading.key });

        // සෙටින්ග්ස් ලබා ගැනීම
        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZANTA-MD";

        // කාලය පරීක්ෂා කිරීම (Duration check)
        if (data.seconds > 3600) {
            return await zanta.sendMessage(from, { text: "⏳ *විනාඩි 60 ට වැඩි Audio දැනට සහය නොදක්වයි.*", edit: loading.key });
        }

        let desc = `🎬 *Title:* ${data.title}\n⏱️ *Duration:* ${data.timestamp}\n\n> *© ${botName}*`;

        // Thumbnail එක යැවීම
        await zanta.sendMessage(from, { image: { url: data.thumbnail }, caption: desc }, { quoted: mek });

        // Scraper එකෙන් Download Link එක ගැනීම
        const songData = await ytmp3(data.url, "192");
        
        if (!songData || !songData.download || !songData.download.url) {
            return await zanta.sendMessage(from, { text: "❌ *ඩවුන්ලෝඩ් ලින්ක් එක ලබා ගැනීමට නොහැක.*", edit: loading.key });
        }

        await zanta.sendMessage(from, { text: "📥 *Uploading to WhatsApp...*", edit: loading.key });

        // [මෙතනයි වැදගත්ම කොටස]: 
        // කෙලින්ම URL එක දීමෙන් බොට්ගේ RAM එක වැය වීම 0% ක් වේ.
        await zanta.sendMessage(from, {
            audio: { url: songData.download.url },
            mimetype: "audio/mpeg",
            fileName: `${data.title}.mp3`
        }, { quoted: mek });

        await zanta.sendMessage(from, { text: "✅ *Done!*", edit: loading.key });
        await m.react("✅");

    } catch (e) {
        console.error(e);
        reply(`❌ *Error:* ${e.message}`);
    }
});
