const { cmd, commands } = require("../command");
const os = require('os');
const config = require("../config");

// 🖼️ NEW PREMIUM IMAGE URL
const MENU_IMAGE_URL = "https://github.com/Akashkavindu/ZANTA_MD/blob/main/images/menu-new.jpg?raw=true";

cmd({
    pattern: "menu",
    react: "💎",
    desc: "Displays the premium unique main menu.",
    category: "main",
    filename: __filename,
},
async (zanta, mek, m, { from, reply, userSettings }) => {
    try {
        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZANTA-MD";
        
        // --- 📊 SYSTEM STATS ---
        const runtime = Number(process.uptime().toFixed(0));
        const hours = Math.floor(runtime / 3600);
        const minutes = Math.floor((runtime % 3600) / 60);
        const seconds = runtime % 60;
        const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

        // --- 🎭 PREMIUN FANCY CAPTION ---
        let menuCaption = `✨ 𝐙𝐀𝐍𝐓𝐀-𝐌𝐃 𝐔𝐋𝐓𝐑𝐀 ✨

👋 ʜᴇʏ *${m.pushName || 'User'}*, ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ᴛʜᴇ ꜰᴜᴛᴜʀᴇ.

┌─────────────────────┈⊷
│ 🖥️ *𝐒𝐘𝐒𝐓𝐄𝐌 𝐃𝐀𝐒𝐇𝐁𝐎𝐀𝐑𝐃*
├─────────────────────┈⊷
│ ⏳ 𝚁𝚞𝚗 : ${hours}𝚑 ${minutes}𝚖 ${seconds}𝚜
│ 🧠 𝚁𝚊𝚖 : ${memory}𝙼𝙱 / 𝟻𝟷𝟸𝙼𝙱
│ 🌍 𝙼𝚘𝚍𝚎 : 𝙿𝚞𝚋𝚕𝚒𝚌 𝙴𝚍𝚒𝚝𝚒𝚘𝚗
│ 🧬 𝚂𝚝𝚊𝚝𝚞𝚜 : 𝙾𝚗𝚕𝚒𝚗𝚎
└─────────────────────┈⊷

⚡ *𝖲𝖾𝗅𝖾𝗀𝗍 𝖸𝗈𝗎𝗋 𝖣𝖾𝗌𝗍𝗂𝗇𝖺𝗍𝗂𝗈𝗇 𝖡𝖾𝗅𝗈𝗐*

🛡️ _𝙿𝚘𝚠𝚎𝚛𝚎𝚍 𝙱𝚢 𝚉𝙰𝙽𝚃𝙰 𝙾𝙵𝙲_ 🚀`;

        // --- 💠 UNIQUE LIST SECTIONS ---
        const sections = [
            {
                title: "🏮 EXPLORE COMMANDS",
                rows: [
                    {title: "📂 ALL COMMANDS", rowId: ".allmenu", description: "The complete command vault"},
                    {title: "📥 DOWNLOAD CENTER", rowId: ".downmenu", description: "High-speed media downloader"},
                    {title: "🎨 CREATIVE TOOLS", rowId: ".convert", description: "Stickers, logos & more"}
                ]
            },
            {
                title: "🛠️ CONTROL PANEL",
                rows: [
                    {title: "📡 LATENCY PING", rowId: ".ping", description: "Check current server speed"},
                    {title: "⚙️ BOT SETTINGS", rowId: ".config", description: "Modify bot preferences"}
                ]
            }
        ];

        const listMessage = {
            image: { url: MENU_IMAGE_URL },
            caption: menuCaption,
            footer: "💎 ZANTA-MD : The Ultimate Assistant",
            title: `🔱 𝐙𝐀𝐍𝐓𝐀 𝐌𝐔𝐒𝐈𝐂 🔱`,
            buttonText: "📜 ᴏᴘᴇɴ ᴍᴇɴᴜ",
            sections
        };

        // 📤 මැසේජ් එක යැවීම
        return await zanta.sendMessage(from, listMessage, { quoted: mek });

    } catch (err) {
        console.error("Menu Error:", err);
        reply("❌ 𝙼𝚎𝚗𝚞 𝚕𝚘𝚊𝚍𝚒𝚗𝚐 𝚏𝚊𝚒𝚕𝚎𝚍.");
    }
});
