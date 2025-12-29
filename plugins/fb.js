const { cmd } = require("../command");
const getFbVideoInfo = require("@xaviabot/fb-downloader");
const config = require('../config');

cmd({
    pattern: "fb",
    alias: ["facebook"],
    react: "📥",
    desc: "Download Facebook Videos safely.",
    category: "download",
    filename: __filename,
}, async (zanta, mek, m, { from, reply, q, userSettings }) => {
    try {
        if (!q) return reply("❤️ *කරුණාකර Facebook වීඩියෝ ලින්ක් එකක් ලබා දෙන්න.*");

        const fbRegex = /(https?:\/\/)?(www\.)?(facebook|fb|fb\.watch)\/.+/;
        if (!fbRegex.test(q)) return reply("☹️ *ලින්ක් එක වැරදියි.*");

        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZANTA-MD";

        // Loading message එක Text එකක් විදිහට යවමු (පසුව Edit කිරීමට පහසුයි)
        const loading = await zanta.sendMessage(from, { text: "⏳ *FB වීඩියෝව පරීක්ෂා කරමින්...*" }, { quoted: mek });

        const result = await getFbVideoInfo(q);

        if (!result || (!result.sd && !result.hd)) {
            return await zanta.sendMessage(from, { text: "❌ *වීඩියෝව සොයාගත නොහැකි විය.*", edit: loading.key });
        }

        const videoUrl = result.hd || result.sd;
        const quality = result.hd ? "HD" : "SD";

        // 1. මුලින් විස්තර සහිත පින්තූරය යවමු
        await zanta.sendMessage(from, {
            image: { url: "https://github.com/Akashkavindu/ZANTA_MD/blob/main/images/fb.jpg?raw=true" },
            caption: `*${botName} FB DOWNLOADER*\n\n✅ *Status:* Downloading...\n👻 *Quality:* ${quality}\n\n> *© ${botName}*`,
        }, { quoted: mek });

        // 2. වීඩියෝව Stream කරමු
        await zanta.sendMessage(from, {
            video: { url: videoUrl },
            mimetype: "video/mp4",
            caption: `*✅ Success! (${quality})*\n\n> *© ${botName}*`,
        }, { quoted: mek });

        // 3. කලින් තිබුණු Loading මැසේජ් එක Edit කරමු
        await zanta.sendMessage(from, { text: "✅ *බාගත කිරීම අවසන්!*", edit: loading.key });

    } catch (e) {
        reply(`❌ *Error:* ${e.message}`);
    }
});
