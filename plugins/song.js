const { cmd } = require("../command");
const axios = require("axios");
const yts = require("yt-search");
const config = require("../config");

// --- 🎵 MAIN SONG COMMAND ---
cmd({
    pattern: "song",
    alias: ["yta", "mp3", "play"],
    react: "🎧",
    desc: "Download YouTube MP3 with selection mode",
    category: "download",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, userSettings, prefix }) => {
    try {
        if (!q) return reply("🎧 *ZANTA-MD SONG SEARCH*\n\nExample: .song alone");

        const search = await yts(q);
        const video = search.videos[0];
        if (!video) return reply("❌ No results found on YouTube.");

        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZANTA-MD";
        const isButtonsOn = settings.buttons === 'true';

        // 1. Buttons ON නම් Selection Menu එක පෙන්වයි
        if (isButtonsOn) {
            let msg = `🎵 *SONG DOWNLOADER* 🎵\n\n` +
                      `📝 *Title:* ${video.title}\n` +
                      `👤 *Artist:* ${video.author.name}\n` +
                      `⏱️ *Duration:* ${video.timestamp}\n` +
                      `🔗 *Link:* ${video.url}\n\n` +
                      `1. 🎶 *AUDIO (Fast)*\n` +
                      `2. 📂 *DOCUMENT (HQ)*\n\n` +
                      `> *© ${botName}*`;

            return await bot.sendMessage(from, {
                image: { url: video.thumbnail },
                caption: msg,
                footer: `Select your format below`,
                buttons: [
                    { buttonId: `${prefix}ytsong_audio ${video.url}`, buttonText: { displayText: "🎶 AUDIO" }, type: 1 },
                    { buttonId: `${prefix}ytsong_doc ${video.url}`, buttonText: { displayText: "📂 DOCUMENT" }, type: 1 }
                ],
                headerType: 4
            }, { quoted: mek });
        }

        // 2. Buttons OFF නම් කෙලින්ම සින්දුව Download කර යවයි
        await m.react("📥");
        const finalLink = await getDownloadLink(video.url);
        
        if (!finalLink) throw new Error("Could not fetch download link.");

        await bot.sendMessage(from, { 
            audio: { url: finalLink }, 
            mimetype: "audio/mpeg", 
            ptt: false 
        }, { quoted: mek });

        await m.react("✅");

    } catch (e) {
        console.log("SONG ERROR:", e);
        reply("❌ *Error:* " + e.message);
    }
});

// --- 🎶 AUDIO DOWNLOADER (Hidden Commands for Reply/Buttons) ---
cmd({
    pattern: "ytsong_audio",
    react: "🎶",
    category: "hidden",
    filename: __filename,
}, async (bot, mek, m, { from, q }) => {
    try {
        if (!q) return;
        const finalLink = await getDownloadLink(q);
        if (finalLink) {
            await bot.sendMessage(from, { audio: { url: finalLink }, mimetype: "audio/mpeg", ptt: false }, { quoted: mek });
        }
    } catch (e) { console.log(e); }
});

// --- 📂 DOCUMENT DOWNLOADER ---
cmd({
    pattern: "ytsong_doc",
    react: "📂",
    category: "hidden",
    filename: __filename,
}, async (bot, mek, m, { from, q }) => {
    try {
        if (!q) return;
        const finalLink = await getDownloadLink(q);
        if (finalLink) {
            await bot.sendMessage(from, { document: { url: finalLink }, mimetype: "audio/mpeg", fileName: `ZANTA-MD-SONG.mp3` }, { quoted: mek });
        }
    } catch (e) { console.log(e); }
});

// --- 🛠️ HELPER: GET DOWNLOAD LINK FROM API ---
async function getDownloadLink(url) {
    try {
        // 1. Manul API
        const apiUrl = `https://api-site-x-by-manul.vercel.app/convert?mp3=${encodeURIComponent(url)}&apikey=Manul-Official`;
        const response = await axios.get(apiUrl);
        if (response.data?.status && response.data?.data?.url) {
            return response.data.data.url;
        }
        
        // 2. Backup API
        const backupUrl = `https://api.giftedtech.my.id/api/download/dlmp3?url=${encodeURIComponent(url)}&apikey=gifted`;
        const { data } = await axios.get(backupUrl);
        return data.result?.download_url;
    } catch (e) {
        console.log("Link Fetch Error:", e.message);
        return null;
    }
}
