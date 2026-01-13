const { cmd } = require("../command");
const yts = require("yt-search");
const config = require("../config");
const axios = require("axios");

// ---------------------------------------------------------------------------
// SONG COMMAND (For Inbox/Groups)
// ---------------------------------------------------------------------------
cmd({
    pattern: "song",
    react: "🎶",
    desc: "Download MP3 Songs.",
    category: "download",
    filename: __filename,
}, async (zanta, mek, m, { from, reply, q, userSettings }) => {
    try {
        if (!q) return reply("❌ *කරුණාකර සින්දුවේ නම හෝ YouTube ලින්ක් එක ලබා දෙන්න.*");

        const loading = await zanta.sendMessage(from, { text: "🔍 *Searching your song...*" }, { quoted: mek });

        const search = await yts(q);
        const data = search.videos[0];
        if (!data) return await zanta.sendMessage(from, { text: "❌ *සින්දුව සොයාගත නොහැකි විය.*", edit: loading.key });

        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZANTA-MD";

        let stylishDesc = `🎶 *|${botName.toUpperCase()} SONG PLAYER|* 🎶
        
🎬 *Title:* ${data.title}
⏱️ *Duration:* ${data.timestamp}
👤 *Author:* ${data.author.name}

> *©️ ${botName.toUpperCase()}*`;

        // Thumbnail එක 404 නොවී ස්ථාවරව යැවීමට මෙතන වෙනස් කළා
        try {
            await zanta.sendMessage(from, { 
                image: { url: data.thumbnail }, 
                caption: stylishDesc
            }, { quoted: mek });
        } catch (imgErr) {
            // Thumbnail එකේ අවුලක් ආවොත් මැසේජ් එක විතරක් යවනවා
            await zanta.sendMessage(from, { text: stylishDesc }, { quoted: mek });
        }

        // Download Audio Using API
        const apiUrl = `https://dark-ytdl-2.vercel.app/download?url=${encodeURIComponent(data.url)}&type=mp3&quality=128`;
        const res = await axios.get(apiUrl);
        
        if (!res.data || !res.data.status || !res.data.result.download_url) {
             return await zanta.sendMessage(from, { text: "❌ *සින්දුව ලබා ගැනීමට නොහැකි විය. වෙනත් සින්දුවක් උත්සාහ කරන්න.*", edit: loading.key });
        }

        // Send Audio File
        await zanta.sendMessage(from, {
            audio: { url: res.data.result.download_url },
            mimetype: "audio/mpeg",
            fileName: `${data.title}.mp3`,
        }, { quoted: mek });

        await zanta.sendMessage(from, { text: "✅ *Download Complete!*", edit: loading.key });
        await m.react("✅");

    } catch (e) {
        console.error("Error in song command:", e);
        reply(`❌ *Error:* ${e.message}`);
    }
});
// ---------------------------------------------------------------------------
// GSONG COMMAND (Send to specific Groups)
// ---------------------------------------------------------------------------
cmd({
    pattern: "gsong",
    desc: "Send song to groups (Simple Mode)",
    category: "download",
    use: ".gsong <group_jid> <song_name>",
    filename: __filename
},
async (zanta, mek, m, { from, q, reply, isOwner, userSettings }) => {
    try {
        if (!isOwner) return reply("❌ අයිතිකරුට පමණි.");
        if (!q) return reply("⚠️ භාවිතා කරන ආකාරය: .gsong <jid> <song_name>");

        const args = q.split(" ");
        const targetJid = args[0].trim(); 
        const songName = args.slice(1).join(" "); 

        if (!targetJid.includes("@")) return reply("⚠️ කරුණාකර නිවැරදි Group JID එකක් ලබා දෙන්න.");

        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const botName = settings.botName || "ZANTA-MD";

        await m.react("🔍");

        const search = await yts(songName);
        const data = search.videos[0];
        if (!data) return reply("❌ සින්දුව සොයාගත නොහැකි විය.");

        if (data.seconds > 3600) { 
            return reply(`⚠️ *සින්දුව ගොඩක් දිග වැඩියි!* (Max: 60 Mins)`);
        }

        // Get Thumbnail Buffer
        const response = await axios.get(data.thumbnail, { responseType: 'arraybuffer' });
        const imgBuffer = Buffer.from(response.data, 'binary');

        const timeLine = "───●──────────"; 
        const imageCaption = `✨ *${botName.toUpperCase()} SONG DOWNLOADER* ✨\n\n` +
                             `📝 *Title:* ${data.title}\n` +
                             `🕒 *Duration:* ${data.timestamp}\n\n` +
                             `   ${timeLine}\n` +
                             `   ⇆ㅤㅤ◁ㅤ❚❚ㅤ▷ㅤ↻`;

        // Send Details to Target Group
        await zanta.sendMessage(targetJid, { 
            image: imgBuffer, 
            caption: imageCaption 
        });

        await m.react("📥");

        // Download Audio Using Stable API
        const apiUrl = `https://dark-ytdl-2.vercel.app/download?url=${encodeURIComponent(data.url)}&type=mp3&quality=128`;
        const res = await axios.get(apiUrl);
        const download = res.data;

        if (!download || !download.status || !download.result || !download.result.download_url) {
            return reply("❌ Download error (API down).");
        }

        // Send Audio to Target Group
        await zanta.sendMessage(targetJid, { 
            audio: { url: download.result.download_url }, 
            mimetype: 'audio/mpeg', 
            ptt: false, 
            fileName: `${data.title}.mp3`
        }, { quoted: null });

        await m.react("✅");
        await reply(`🚀 *Successfully Shared to Group!*`);

    } catch (e) {
        console.error("GSong Error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});
