const { cmd } = require('../command');
const config = require('../config');
const aliveMsg = require('./aliveMsg');

cmd({
    pattern: "alive",
    react: "🤖",
    desc: "Check if the bot is online.",
    category: "main",
    filename: __filename
},
async (zanta, mek, m, { from, reply, userSettings }) => { // <--- මෙතනට userSettings ඇතුළත් කළා
    try {
        // [වැදගත්]: ඩේටාබේස් එකෙන් එන userSettings ලබා ගනී, නැත්නම් Default settings ගනී
        const settings = userSettings || global.CURRENT_BOT_SETTINGS;
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZANTA-MD";
        const prefix = settings.prefix || config.DEFAULT_PREFIX || ".";

        // aliveMsg.js එකෙන් template එක ගෙන placeholders replace කිරීම
        const finalMsg = aliveMsg.getAliveMessage()
            .replace(/{BOT_NAME}/g, botName)
            .replace(/{OWNER_NUMBER}/g, config.OWNER_NUMBER)
            .replace(/{PREFIX}/g, prefix);

        return await zanta.sendMessage(from, {
            image: { url: config.ALIVE_IMG },
            caption: finalMsg
        }, { quoted: mek });

    } catch (e) {
        console.error("[ALIVE ERROR]", e);
        reply(`❌ Error: ${e.message}`);
    }
});
