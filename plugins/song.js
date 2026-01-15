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
    alias: ["yta", "ytmp3", "gsong"],
    desc: "Download MP3 with Hybrid Fallback",
    category: "download",
    filename: __filename,
},
async (bot, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("🎼 *කරුණාකර සින්දුවක නමක් හෝ ලින්ක් එකක් ලබා දෙන්න.*");
        await m.react("🔍");

        const video = await getYoutube(q);
        if (!video) return reply("❌ *ප්‍රතිඵල හමු නොවීය.*");

        const caption = `✨ *ᴢᴀɴᴛᴀ-ᴍᴅ sᴏɴɢ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* ✨\n\n📝 *ᴛɪᴛʟᴇ:* ${video.title}\n👤 *ᴀᴜᴛʜᴏʀ:* ${video.author.name}\n🕒 *ᴅᴜʀᴀᴛɪᴏɴ:* ${video.timestamp}\n🔗 *ʟɪɴᴋ:* ${video.url}\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴢᴀɴᴛᴀ-ᴍᴅ*`;

        await bot.sendMessage(from, { image: { url: video.thumbnail }, caption }, { quoted: mek });
        await m.react("📥");

        const data = await getAudioFile(video.url);
        
        if (!data || !data.status || !fs.existsSync(data.filePath)) {
            await m.react("❌");
            return reply("❌ *බාගත කිරීම අසාර්ථක විය. පසුව උත්සාහ කරන්න.*");
        }

        await bot.sendMessage(from, { 
            audio: { url: data.filePath }, 
            mimetype: "audio/mpeg", 
            fileName: `${video.title}.mp3` 
        }, { quoted: mek });

        if (fs.existsSync(data.filePath)) fs.unlinkSync(data.filePath);
        await m.react("✅");

    } catch (e) {
        console.error("Song Command Error:", e);
        reply("❌ දෝෂයක්: " + e.message);
    }
});

// --- VIDEO DOWNLOADER (MP4) ---
cmd({
    pattern: "video",
    alias: ["ytv", "ytmp4"],
    desc: "Download YouTube MP4 with Hybrid Fallback",
    category: "download",
    filename: __filename,
},
async (bot, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("🎬 *කරුණාකර වීඩියෝ නමක් හෝ ලින්ක් එකක් ලබා දෙන්න.*");
        await m.react("🔍");

        const video = await getYoutube(q);
        if (!video) return reply("❌ *ප්‍රතිඵල හමු නොවීය.*");

        const caption = `🎬 *ᴢᴀɴᴛᴀ-ᴍᴅ ᴠɪᴅᴇᴏ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* 🎬\n\n📝 *ᴛɪᴛʟᴇ:* ${video.title}\n🕒 *ᴅᴜʀᴀᴛɪᴏɴ:* ${video.timestamp}\n🔗 *ʟɪɴᴋ:* ${video.url}\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴢᴀɴᴛᴀ-ᴍᴅ*`;

        await bot.sendMessage(from, { image: { url: video.thumbnail }, caption }, { quoted: mek });
        await m.react("📥");

        const data = await getVideoFile(video.url);
        
        if (!data || !data.status || !fs.existsSync(data.filePath)) {
            await m.react("❌");
            return reply("❌ *වීඩියෝව බාගත කිරීම අසාර්ථක විය.*");
        }

        await bot.sendMessage(from, {
            video: { url: data.filePath },
            mimetype: "video/mp4",
            caption: `🎬 ${video.title}`,
        }, { quoted: mek });

        if (fs.existsSync(data.filePath)) fs.unlinkSync(data.filePath);
        await m.react("✅");

    } catch (e) {
        console.error("Video Command Error:", e);
        reply("❌ දෝෂයක්: " + e.message);
    }
});
