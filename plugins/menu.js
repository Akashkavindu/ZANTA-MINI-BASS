const { cmd, commands } = require("../command");
const os = require('os');
const config = require("../config");

// 🖼️ MENU Image URL
const MENU_IMAGE_URL = "https://github.com/Akashkavindu/ZANTA_MD/blob/main/images/menu-new.jpg?raw=true";

cmd({
    pattern: "menu",
    react: "💎",
    desc: "Displays the premium button menu.",
    category: "main",
    filename: __filename,
},
async (zanta, mek, m, { from, reply, userSettings, prefix }) => {
    try {
        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZANTA-MD";
        
        // --- 📊 SYSTEM STATS ---
        const runtime = Number(process.uptime().toFixed(0));
        const hours = Math.floor(runtime / 3600);
        const minutes = Math.floor((runtime % 3600) / 60);
        const seconds = runtime % 60;
        const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

        // --- 🎭 PREMIUM FANCY CAPTION ---
        let menuCaption = `✨ *𝐙𝐀𝐍𝐓𝐀-𝐌𝐃 𝐔𝐋𝐓𝐑𝐀* ✨

👋 ʜᴇʏ *${m.pushName || 'User'}*, ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ᴛʜᴇ ꜰᴜᴛᴜʀᴇ.

┌─────────────────────┈⊷
│ 🖥️ *𝐒𝐘𝐒𝐓𝐄𝐌 𝐃𝐀𝐒𝐇𝐁𝐎𝐀𝐑𝐃*
├─────────────────────┈⊷
│ ⏳ 𝚁𝚞𝚗 : ${hours}𝚑 ${minutes}𝚖 ${seconds}𝚜
│ 🧠 𝚁𝚊𝚖 : ${memory}𝙼𝙱 / 𝟻𝟷𝟸𝙼𝙱
│ 🌍 𝙼𝚘𝚍𝚎 : 𝙿𝚞𝚋𝚕𝚒𝚌 𝙴𝚍𝚒𝚝𝚒𝚘𝚗
│ 🧬 𝚂𝚝𝚊𝚝𝚞𝚜 : 𝙾𝚗𝚕𝚒𝚗𝚎
└─────────────────────┈⊷

⚡ *𝖲𝖾𝗅𝖾𝗀𝗍 𝖺 𝖼𝖺𝗍𝖾𝗀𝗈𝗋𝗿 𝖻𝖾𝗅𝗈𝗐*

🛡️ _𝙿𝚘𝚠𝚎𝚛𝚎𝚍 𝙱𝚢 𝚉𝙰𝙽𝚃𝙰 𝙾𝙵𝙲_ 🚀`;

        // --- 🔘 QUICK REPLY BUTTONS (As in your image) ---
        const buttons = [
            { buttonId: `${prefix}allmenu`, buttonText: { displayText: '📂 ALL MENU' }, type: 1 },
            { buttonId: `${prefix}downmenu`, buttonText: { displayText: '📥 DOWNLOAD' }, type: 1 },
            { buttonId: `${prefix}ping`, buttonText: { displayText: '📡 PING' }, type: 1 }
        ];

        const buttonMessage = {
            image: { url: MENU_IMAGE_URL },
            caption: menuCaption,
            footer: "💎 ZANTA-MD : The Ultimate Assistant",
            buttons: buttons,
            headerType: 4 // Image header
        };

        // 📤 මැසේජ් එක යැවීම
        return await zanta.sendMessage(from, buttonMessage, { quoted: mek });

    } catch (err) {
        console.error("Menu Error:", err);
        reply("❌ 𝙼𝚎𝚗𝚞 𝚕𝚘𝚊𝚍𝚒𝚗𝚐 𝚏𝚊𝚒𝚕𝚎𝚍.");
    }
});
