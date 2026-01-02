const { cmd, commands } = require("../command");
const os = require('os');
const config = require("../config");

const MENU_IMAGE_URL = "https://github.com/Akashkavindu/ZANTA_MD/blob/main/images/menu-new.jpg?raw=true";

cmd({
    pattern: "menu",
    react: "💎",
    desc: "Premium Menu without errors.",
    category: "main",
    filename: __filename,
},
async (zanta, mek, m, { from, reply, userSettings, prefix }) => {
    try {
        const runtime = Number(process.uptime().toFixed(0));
        const hours = Math.floor(runtime / 3600);
        const minutes = Math.floor((runtime % 3600) / 60);
        const seconds = runtime % 60;
        const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

        let menuCaption = `✨ *𝐙𝐀𝐍𝐓𝐀-𝐌𝐃 𝐔𝐋𝐓𝐑𝐀* ✨

👋 ʜᴇʏ *${m.pushName || 'User'}*

┌─────────────────────┈⊷
│ 🖥️ *𝐒𝐘𝐒𝐓𝐄𝐌 𝐃𝐀𝐒𝐇𝐁𝐎𝐀𝐑𝐃*
├─────────────────────┈⊷
│ ⏳ 𝚁𝚞𝚗 : ${hours}𝚑 ${minutes}𝚖
│ 🧠 𝚁𝚊𝚖 : ${memory}𝙼𝙱 / 𝟻𝟷𝟸𝙼𝙱
│ 🌍 𝙼𝚘𝚍𝚎 : 𝙿𝚞𝚋𝚕𝚒𝚌 𝙴𝚍𝚒𝚝𝚒𝚘𝚗
└─────────────────────┈⊷

⚡ *𝖲𝖾𝗅𝖾𝗀𝗍 𝖸𝗈𝗎𝗋 𝖣𝖾𝗌𝗍𝗂𝗇𝖺𝗍𝗂𝗈𝗇 𝖡𝖾𝗅𝗈𝗐*`;

        // 1. මුලින්ම Image එක Caption එකත් එක්ක යවනවා (Error එක එන්නේ මෙතන බටන් තිබ්බොත්)
        await zanta.sendMessage(from, { 
            image: { url: MENU_IMAGE_URL }, 
            caption: menuCaption 
        }, { quoted: mek });

        // 2. ඊට පස්සේ බටන් මැසේජ් එක විතරක් යවනවා (මේක 100% වැඩ)
        const buttons = [
            { buttonId: `${prefix}allmenu`, buttonText: { displayText: '📂 ALL MENU' }, type: 1 },
            { buttonId: `${prefix}downmenu`, buttonText: { displayText: '📥 DOWNLOAD' }, type: 1 },
            { buttonId: `${prefix}ping`, buttonText: { displayText: '📡 PING' }, type: 1 }
        ];

        const buttonMessage = {
            text: "Please select an option below:",
            footer: "💎 ZANTA-MD : The Ultimate Assistant",
            buttons: buttons,
            headerType: 1
        };

        return await zanta.sendMessage(from, buttonMessage, { quoted: mek });

    } catch (err) {
        console.error("Menu Error:", err);
        // Error එකක් ආවොත් බටන් නැතුව හරි මැසේජ් එක යවන්න
        reply("❌ 𝙼𝚎𝚗𝚞 𝚕𝚘𝚊𝚍𝚒𝚗𝚐 𝚏𝚊𝚒𝚕𝚎𝚍. Try again.");
    }
});
