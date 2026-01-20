const { cmd, commands } = require('../command'); // commands require කරගත්තා logic එකට
const config = require('../config');
const aliveMsg = require('./aliveMsg');
const { sendButtons } = require("gifted-btns");

const CHANNEL_JID = "120363406265537739@newsletter"; 
const ALIVE_VIDEO_URL = "https://github.com/Akashkavindu/ZANTA_MD/blob/main/images/8e7465c0-91d8-4b94-866f-0f84cd1edb41.mp4?raw=true";

cmd({
    pattern: "alive",
    react: "🤖",
    desc: "Check if the bot is online.",
    category: "main",
    filename: __filename
},
async (zanta, mek, m, { from, reply, userSettings }) => {
    try {
        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZANTA-MD";
        const prefix = settings.prefix || config.DEFAULT_PREFIX || ".";
        const isButtonsOn = settings.buttons === 'true';

        // Placeholder replace කිරීම
        const finalMsg = aliveMsg.getAliveMessage()
            .replace(/{BOT_NAME}/g, botName)
            .replace(/{OWNER_NUMBER}/g, config.OWNER_NUMBER)
            .replace(/{PREFIX}/g, prefix);

        if (isButtonsOn) {
            // --- 🔵 BUTTONS ON MODE (With Video Note) ---

            // 1. Video Note (PTV) එක යැවීම
            await zanta.sendMessage(from, { 
                video: { url: ALIVE_VIDEO_URL }, 
                ptv: true 
            }, { quoted: mek });

            // 2. Buttons යැවීම
            const buttons = [
                { id: prefix + "ping", text: "⚡ PING" },
                { id: prefix + "menu", text: "📜 MENU" },
                { id: prefix + "settings", text: "⚙️ SETTINGS" },
                { id: prefix + "help", text: "📞 HELP" },
            ];

            return await sendButtons(zanta, from, {
                text: finalMsg,
                footer: `© ${botName} - Cyber System`,
                buttons: buttons
            });

        } else {
            // --- 🟢 BUTTONS OFF MODE (With Video Caption) ---
            return await zanta.sendMessage(from, {
                video: { url: ALIVE_VIDEO_URL },
                caption: finalMsg,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: CHANNEL_JID,
                        serverMessageId: 100,
                        newsletterName: "ZANTA-MD UPDATES"
                    }
                }
            }, { quoted: mek });
        }

    } catch (e) {
        console.error("[ALIVE ERROR]", e);
        reply(`❌ Error: ${e.message}`);
    }
});
