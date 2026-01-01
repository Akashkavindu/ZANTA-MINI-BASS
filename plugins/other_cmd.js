const gis = require('g-i-s');
const { cmd } = require("../command");
const { translate } = require('@vitalets/google-translate-api');
const config = require("../config");
const axios = require("axios");

// 1. JID Finder
cmd({
    pattern: "jid",
    alias: ["myid", "userjid"],
    react: "🆔",
    category: "main",
    filename: __filename,
}, async (zanta, mek, m, { from, sender, isGroup, userSettings }) => {
    try {
        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZANTA-MD";
        
        let targetJid;
        let contextMsg = "";

        // 1. මැසේජ් එකක් Quoted කරලා තිබේ නම්
        if (m.quoted) {
            // Forward කරපු මැසේජ් එකක් නම් (චැනල් JID එක මෙතන තියෙන්නේ)
            if (m.quoted.contextInfo && m.quoted.contextInfo.forwardingScore > 0) {
                // මෙතනදී newsletter/channel JID එක ගන්නේ මෙහෙමයි
                targetJid = m.quoted.contextInfo.remoteJid || m.quoted.contextInfo.participant;
                contextMsg = "📢 *Forwarded Source JID*";
            } 
            // එසේ නොවේ නම් සාමාන්්‍ය Quoted User JID
            else {
                targetJid = m.quoted.sender;
                contextMsg = "👤 *Quoted User JID*";
            }
        } 
        // 2. කිසිවක් Quoted කර නැත්නම් මැසේජ් එක එවූ Chat එකේ JID
        else {
            // මෙන්න මෙතන තමයි වෙනස් කළේ: 'sender' වෙනුවට 'from' පාවිච්චි කළා
            targetJid = from;
            contextMsg = isGroup ? "🏢 *Current Group JID*" : "👤 *Current Chat JID*";
        }

        let jidMsg = `🆔 *JID INFORMATION*\n\n`;
        jidMsg += `${contextMsg}:\n🎫 \`${targetJid}\`\n`;
        
        // Sender ගේ JID එකත් අමතරව ඕන නම් මෙහෙම දාන්න පුළුවන්
        if (isGroup || m.quoted) {
            jidMsg += `\n👤 *Your JID:*\n🎫 \`${sender}\`\n`;
        }

        jidMsg += `\n> *© ${botName}*`;

        await zanta.sendMessage(from, { text: jidMsg, mentions: [sender, targetJid] }, { quoted: mek });
    } catch (err) {
        console.error(err);
    }
});
// 2. Speed Test
cmd({
    pattern: "speed",
    alias: ["system", "ms"],
    react: "⚡",
    category: "main",
    filename: __filename,
}, async (zanta, mek, m, { from, userSettings }) => {
    try {
        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZANTA-MD";
        const startTime = Date.now();

        const pinger = await zanta.sendMessage(from, { text: "🚀 *Checking...*" }, { quoted: mek });
        const ping = Date.now() - startTime;

        await zanta.sendMessage(from, { 
            text: `⚡ *${botName} SPEED*\n\n🚄 *Latency:* ${ping}ms\n📡 *Status:* Online\n\n> *© ${botName}*`, 
            edit: pinger.key 
        });
    } catch (err) {}
});

// 3. Image Downloader (GIS)
cmd({
    pattern: "img",
    alias: ["image", "gimg"],
    react: "🖼️",
    category: "download",
    filename: __filename,
}, async (zanta, mek, m, { from, reply, q, userSettings }) => {
    try {
        if (!q) return reply("❤️ *කරුණාකර නමක් ලබා දෙන්න.*");
        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZANTA-MD";

        gis(q, async (error, results) => {
            if (error || !results || results.length === 0) return reply("❌ *පින්තූර සොයාගත නොහැකි විය.*");

            // RAM එක ඉතිරි කරගන්න කෙලින්ම URL එකෙන් Image එක යැවීම
            await zanta.sendMessage(from, {
                image: { url: results[0].url },
                caption: `*🖼️ IMAGE DOWNLOADER*\n🔍 *Query:* ${q}\n\n> *© ${botName}*`,
            }, { quoted: mek });
        });
    } catch (e) {}
});

// 4. Translator
cmd({
    pattern: "tr",
    alias: ["translate"],
    react: "🌍",
    category: "convert",
    filename: __filename,
}, async (zanta, mek, m, { from, reply, q, userSettings }) => {
    try {
        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZANTA-MD";
        const text = m.quoted ? m.quoted.body : q;

        if (!text) return reply("❤️ *පණිවිඩයකට Reply කරන්න හෝ වචනයක් ලබා දෙන්න.*");

        const loading = await zanta.sendMessage(from, { text: "🔠 *Translating...*" }, { quoted: mek });
        const result = await translate(text, { to: 'si' });

        await zanta.sendMessage(from, { 
            text: `${result.text}\n\n> *© ${botName}*`, 
            edit: loading.key 
        });
    } catch (err) {
        reply("❌ *පරිවර්තනය අසාර්ථක විය.*");
    }
});

cmd({
    pattern: "owner",
    alias: ["developer", "dev"],
    react: "👑",
    desc: "Get Owner Details.",
    category: "main",
    filename: __filename
}, async (zanta, mek, m, { from, reply, userSettings }) => {
    try {
        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "ZANTA-MD";

        // ලෝගෝ එක Buffer එකක් ලෙස ලබා ගැනීම
        let logoRes = await axios.get("https://github.com/Akashkavindu/ZANTA_MD/blob/main/images/WhatsApp%20Image%202025-12-29%20at%209.28.43%20AM.jpeg?raw=true", { responseType: 'arraybuffer' });
        let logoBuffer = Buffer.from(logoRes.data, 'binary');

        // ඔයාගේ විස්තර මෙතන ලස්සනට දාන්න පුළුවන්
        let ownerMsg = `👑 *|${botName.toUpperCase()} OWNER INFO|* 👑

👤 *Name:* Akash kavindu
🌍 *Location:* Sri Lanka 🇱🇰
📱 *WhatsApp:* 94743404814

📢 *Join our Channel:* https://whatsapp.com/channel/0029VbBc42s84OmJ3V1RKd2B

> *©️ 𝐙𝐀𝐍𝐓𝐀 𝐎𝐅𝐂*`;

        // මැසේජ් එක යැවීම
        await zanta.sendMessage(from, {
            image: logoBuffer, // ඔයාගේ ලෝගෝ එකම මේකටත් පාවිච්චි කළා
            caption: ownerMsg,
            contextInfo: {
                externalAdReply: {
                    title: "ZANTA-MD OFFICIAL OWNER ✅",
                    body: "©️ 𝐙𝐀𝐍𝐓𝐀 𝐎𝐅𝐂",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    showAdAttribution: true,
                    thumbnail: logoBuffer,
                    sourceUrl: "https://whatsapp.com/channel/0029VbBc42s84OmJ3V1RKd2B"
                }
            }
        }, { quoted: mek });

    } catch (e) {
        reply(`❌ *Error:* ${e.message}`);
    }
});
