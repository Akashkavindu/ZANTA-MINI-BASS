const { cmd } = require("../command");
const yts = require("yt-search");
const { ytmp3 } = require("@vreden/youtube_scraper");
const config = require("../config");
const axios = require("axios");

cmd({
    pattern: "song",
    react: "🎶",
    desc: "Download MP3 Songs with full details UI.",
    category: "download",
    filename: __filename,
}, async (zanta, mek, m, { from, reply, q, userSettings }) => {
    try {
        if (!q) return reply("❌ *කරුණාකර සින්දුවේ නම හෝ YouTube ලින්ක් එක ලබා දෙන්න.*");

        const loading = await zanta.sendMessage(from, { text: "🔍 *Searching your song...*" }, { quoted: mek });

        const search = await yts(q);
        const data = search.videos[0];
        if (!data) return await zanta.sendMessage(from, { text: "❌ *සින්දුව සොයාගත නොහැකි විය.*", edit: loading.key });

        // DATABASE BOT NAME
        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZANTA-MD";

        // ලෝගෝ එක Buffer එකක් විදියට මෙතැනදී ගන්නවා
        let logoResponse = await axios.get("https://github.com/Akashkavindu/ZANTA_MD/blob/main/images/WhatsApp%20Image%202025-12-29%20at%209.28.43%20AM.jpeg?raw=true", { responseType: 'arraybuffer' });
        let logoBuffer = Buffer.from(logoResponse.data, 'binary');

        if (data.seconds > 3600) {
            return await zanta.sendMessage(from, { text: "⏳ *විනාඩි 60 ට වැඩි Audio දැනට සහය නොදක්වයි.*", edit: loading.key });
        }

        // --- 🎨 YOUR REQUESTED CAPTION STYLE ---
        let stylishDesc = `🎶 *|${botName.toUpperCase()} SONG PLAYER|* 🎶
        
🎬 *Title:* ${data.title}
⏱️ *Duration:* ${data.timestamp}
👤 *Author:* ${data.author.name}
📅 *Uploaded:* ${data.ago}
👀 *Views:* ${data.views.toLocaleString()}

> *©️ ${botName.toUpperCase()}*`;

        // --- 🖼️ UI WITH WHATSAPP BUSINESS CARD ---
        await zanta.sendMessage(from, { 
            image: { url: data.thumbnail }, 
            caption: stylishDesc,
            contextInfo: {
                externalAdReply: {
                    title: "WhatsApp Business • Status ✅",
                        body: "©️ 𝐙𝐀𝐍𝐓𝐀 𝐎𝐅𝐂", 
                        mediaType: 1,
                        renderLargerThumbnail: true, 
                        showAdAttribution: true,
                        thumbnail: logoBuffer,
                        sourceUrl: "https://whatsapp.com/channel/0029VbBc42s84OmJ3V1RKd2B" 
                }
            }
                
            
        }, { quoted: mek });

        const songData = await ytmp3(data.url, "192");

        if (!songData || !songData.download || !songData.download.url) {
            return await zanta.sendMessage(from, { text: "❌ *ඩවුන්ලෝඩ් ලින්ක් එක ලබා ගැනීමට නොහැක.*", edit: loading.key });
        }

        // --- AUDIO FILE UPLOAD ---
        await zanta.sendMessage(from, {
            audio: { url: songData.download.url },
            mimetype: "audio/mpeg",
            fileName: `${data.title}.mp3`,
            contextInfo: {
            }
        }, { quoted: mek });

        await zanta.sendMessage(from, { text: "✅ *Download Complete!*", edit: loading.key });
        await m.react("✅");

    } catch (e) {
        console.error(e);
        reply(`❌ *Error:* ${e.message}`);
    }
});

cmd({
    pattern: "csong",
    desc: "Send song to channel",
    category: "download",
    use: ".csong <jid> <song name>",
    filename: __filename
},
async (zanta, mek, m, { from, q, reply, isOwner, userSettings }) => {
    try {
        if (!isOwner) return reply("❌ මෙම කමාන්ඩ් එක භාවිතා කළ හැක්කේ බොට් අයිතිකරුට පමණි.");
        if (!q) return reply("⚠️ භාවිතා කරන ආකාරය: .csong <jid> <song_name>");

        const args = q.split(" ");
        const targetJid = args[0]; 
        const songName = args.slice(1).join(" "); 

        if (!targetJid.includes("@") || !songName) {
            return reply("⚠️ කරුණාකර නිවැරදි JID එකක් සහ සින්දුවේ නමක් ලබා දෙන්න.");
        }

        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZANTA-MD";

        // 1. සින්දුව සෙවීම
        const search = await yts(songName);
        const data = search.videos[0];
        if (!data) return reply("❌ සින්දුව සොයාගත නොහැකි විය.");

        // 2. Music Player Style Caption එක (ඔයා එවපු Image එකේ විදිහට)
        let playerCaption = `📄 TITLE : ${data.title} ⏳ ❤️ 🎧

.ilililililiililililililiililililililiilililil.

01:24━━━━🔘━━━━━━━${data.timestamp}
     ↻     ◁   II   ▷     ↺

|  ${botName.toUpperCase()} MUSIC ❤️ 🎧`;

        // 3. මුලින්ම Image එක සහ Caption එක Target JID එකට යැවීම
        await zanta.sendMessage(targetJid, { 
            image: { url: data.thumbnail }, 
            caption: playerCaption 
        });

        // 4. සින්දුව Download කිරීම
        const songData = await ytmp3(data.url, "192");
        if (!songData || !songData.download || !songData.download.url) {
            return reply("❌ ඩවුන්ලෝඩ් ලින්ක් එක ලබා ගැනීමට නොහැක.");
        }

        // 5. Audio එක සෙන්ඩ් කිරීම (Document එකක් ලෙස channel වලට වඩාත් සුදුසුයි)
        await zanta.sendMessage(targetJid, { 
            document: { url: songData.download.url }, 
            mimetype: 'audio/mpeg', 
            fileName: `${data.title}.mp3`,
            caption: `🎵 *${data.title}*\n> *© ${botName}*`
        });

        await reply(`✅ Successfully sent to channel: ${targetJid}`);

    } catch (e) {
        console.error(e);
        reply(`❌ Error: ${e.message}`);
    }
});
