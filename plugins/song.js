const { cmd } = require("../command");
const yts = require("yt-search");
const fs = require("fs");
const { getAudioFile, getVideoFile } = require("../api/song");

async function getYoutube(query) {
    const isUrl = /(youtube\.com|youtu\.be)/i.test(query);
    if (isUrl) {
        const id = query.split("v=")[1] || query.split("/").pop();
        const info = await yts({ videoId: id });
        return info;
    }
    const search = await yts(query);
    return search.videos.length ? search.videos[0] : null;
}

// --- SONG DOWNLOADER (MP3) ---
cmd({
    pattern: "song",
    alias: ["yta", "ytmp3"],
    desc: "Download MP3 with a premium look",
    category: "download",
    filename: __filename,
},
async (bot, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("🎼 *කරුණාකර සින්දුවක නමක් හෝ ලින්ක් එකක් ලබා දෙන්න.*");
        await m.react("🔍");

        const video = await getYoutube(q);
        if (!video) return reply("❌ *ප්‍රතිඵල හමු නොවීය.*");

        const caption = `
✨ *ᴢᴀɴᴛᴀ-ᴍᴅ sᴏɴɢ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* ✨

📝 *ᴛɪᴛʟᴇ:* ${video.title}
👤 *ᴀᴜᴛʜᴏʀ:* ${video.author.name}
🕒 *ᴅᴜʀᴀᴛɪᴏɴ:* ${video.timestamp}
🔗 *ʟɪɴᴋ:* ${video.url}

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴢᴀɴᴛᴀ-ᴍᴅ*`;

        await bot.sendMessage(from, { image: { url: video.thumbnail }, caption }, { quoted: mek });
        await m.react("📥");

        const data = await getAudioFile(video.url);
        if (!data.status) return reply("❌ *බාගත කිරීමේ දෝෂයක්:* " + data.error);

        await bot.sendMessage(from, { 
            audio: fs.readFileSync(data.filePath), 
            mimetype: "audio/mpeg", 
            fileName: `${video.title}.mp3` 
        }, { quoted: mek });

        fs.unlinkSync(data.filePath);
        await m.react("✅");

    } catch (e) {
        reply("❌ දෝෂයක්: " + e.message);
    }
});

// --- VIDEO DOWNLOADER (MP4) ---
cmd({
    pattern: "video",
    alias: ["ytv", "ytmp4"],
    desc: "Download YouTube MP4 via Custom API",
    category: "download",
    filename: __filename,
},
async (bot, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("🎬 *කරුණාකර වීඩියෝ නමක් හෝ ලින්ක් එකක් ලබා දෙන්න.*");
        await m.react("🔍");

        const video = await getYoutube(q);
        if (!video) return reply("❌ *ප්‍රතිඵල හමු නොවීය.*");

        const caption = `
🎬 *ᴢᴀɴᴛᴀ-ᴍᴅ ᴠɪᴅᴇᴏ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* 🎬

📝 *ᴛɪᴛʟᴇ:* ${video.title}
🕒 *ᴅᴜʀᴀᴛɪᴏɴ:* ${video.timestamp}
🔗 *ʟɪɴᴋ:* ${video.url}

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴢᴀɴᴛᴀ-ᴍᴅ*`;

        await bot.sendMessage(from, { image: { url: video.thumbnail }, caption }, { quoted: mek });
        await m.react("📥");

        const data = await getVideoFile(video.url);
        if (!data.status) return reply("❌ *බාගත කිරීම අසාර්ථක විය.*");

        await bot.sendMessage(from, {
            video: fs.readFileSync(data.filePath),
            mimetype: "video/mp4",
            caption: `🎬 ${video.title}`,
        }, { quoted: mek });

        fs.unlinkSync(data.filePath);
        await m.react("✅");
    } catch (e) {
        reply("❌ දෝෂයක්: " + e.message);
    }
});

// --- GSONG COMMAND ---
cmd({
    pattern: "gsong",
    alias: ["google-song", "isong"],
    desc: "Download MP3 with a premium look",
    category: "download",
    filename: __filename,
},
async (bot, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("🎼 *කරුණාකර නමක් ලබා දෙන්න.*");
        await m.react("🔍");

        const video = await getYoutube(q);
        if (!video) return reply("❌ *ප්‍රතිඵල නැත.*");

        const premiumCaption = `
✨ *ᴢᴀɴᴛᴀ-ᴍᴅ ᴘʀᴇᴍɪᴜᴍ sᴏɴɢ* ✨

📝 *ᴛɪᴛʟᴇ:* ${video.title}
👤 *ᴀᴜᴛʜᴏʀ:* ${video.author.name}
👁️ *ᴠɪᴇᴡs:* ${video.views.toLocaleString()}
🔗 *ʟɪɴᴋ:* ${video.url}

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴢᴀɴᴛᴀ-ᴍᴅ*`;

        await bot.sendMessage(from, { image: { url: video.thumbnail }, caption: premiumCaption }, { quoted: mek });
        await m.react("📥");

        const data = await getAudioFile(video.url);
        if (!data.status) return reply("❌ දෝෂයකි.");

        await bot.sendMessage(from, {
            audio: fs.readFileSync(data.filePath),
            mimetype: "audio/mpeg",
            fileName: `${video.title}.mp3`
        }, { quoted: mek });

        fs.unlinkSync(data.filePath);
        await m.react("✅");
    } catch (e) {
        reply("❌ Error: " + e.message);
    }
});
