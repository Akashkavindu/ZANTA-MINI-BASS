const gis = require("g-i-s");
const { cmd } = require("../command");
const { translate } = require("@vitalets/google-translate-api");
const config = require("../config");
const axios = require("axios");

// 1. JID Finder
cmd(
    {
        pattern: "jid",
        alias: ["myid", "userjid"],
        react: "🆔",
        category: "main",
        filename: __filename,
    },
    async (zanta, mek, m, { from, sender, isGroup, userSettings }) => {
        try {
            const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
            const botName =
                settings.botName || config.DEFAULT_BOT_NAME || "ZANTA-MD";

            let targetJid;
            let contextMsg = "";

            // 1. මැසේජ් එකක් Quoted කරලා තිබේ නම්
            if (m.quoted) {
                // Forward කරපු මැසේජ් එකක් නම් (චැනල් JID එක මෙතන තියෙන්නේ)
                if (
                    m.quoted.contextInfo &&
                    m.quoted.contextInfo.forwardingScore > 0
                ) {
                    // මෙතනදී newsletter/channel JID එක ගන්නේ මෙහෙමයි
                    targetJid =
                        m.quoted.contextInfo.remoteJid ||
                        m.quoted.contextInfo.participant;
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
                contextMsg = isGroup
                    ? "🏢 *Current Group JID*"
                    : "👤 *Current Chat JID*";
            }

            let jidMsg = `🆔 *JID INFORMATION*\n\n`;
            jidMsg += `${contextMsg}:\n🎫 \`${targetJid}\`\n`;

            // Sender ගේ JID එකත් අමතරව ඕන නම් මෙහෙම දාන්න පුළුවන්
            if (isGroup || m.quoted) {
                jidMsg += `\n👤 *Your JID:*\n🎫 \`${sender}\`\n`;
            }

            jidMsg += `\n> *© ${botName}*`;

            await zanta.sendMessage(
                from,
                { text: jidMsg, mentions: [sender, targetJid] },
                { quoted: mek },
            );
        } catch (err) {
            console.error(err);
        }
    },
);
// 2. Speed Test
cmd(
    {
        pattern: "speed",
        alias: ["system", "ms"],
        react: "⚡",
        category: "main",
        filename: __filename,
    },
    async (zanta, mek, m, { from, userSettings }) => {
        try {
            const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
            const botName =
                settings.botName || config.DEFAULT_BOT_NAME || "ZANTA-MD";
            const startTime = Date.now();

            // මුලින්ම පණිවිඩය යවයි
            const pinger = await zanta.sendMessage(
                from,
                { text: "🚀 *Checking...*" },
                { quoted: mek },
            );
            const ping = Date.now() - startTime;

            // Edit කරන මැසේජ් එකට Channel Context එක එකතු කිරීම
            await zanta.sendMessage(from, {
                text: `⚡ *${botName} SPEED*\n\n🚄 *Latency:* ${ping}ms\n📡 *Status:* Online\n\n> *© ${botName}*`,
                edit: pinger.key,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363404058637485@newsletter", // 👈 මෙතනට ඔයාගේ Channel JID එක දාන්න
                        newsletterName: "ZANTA-MD BOT OFFICIAL", // 👈 මෙතනට චැනල් එකේ නම දාන්න
                        serverMessageId: 143,
                    },
                },
            });
        } catch (err) {
            console.error(err);
        }
    },
);

// 4. Translator
cmd(
    {
        pattern: "tr",
        alias: ["translate"],
        react: "🌍",
        category: "tools",
        filename: __filename,
    },
    async (zanta, mek, m, { from, reply, q, userSettings }) => {
        try {
            const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
            const botName =
                settings.botName || config.DEFAULT_BOT_NAME || "ZANTA-MD";
            const text = m.quoted ? m.quoted.body : q;

            if (!text)
                return reply("❤️ *පණිවිඩයකට Reply කරන්න හෝ වචනයක් ලබා දෙන්න.*");

            const loading = await zanta.sendMessage(
                from,
                { text: "🔠 *Translating...*" },
                { quoted: mek },
            );
            const result = await translate(text, { to: "si" });

            await zanta.sendMessage(from, {
                text: `${result.text}\n\n> *© ${botName}*`,
                edit: loading.key,
            });
        } catch (err) {
            reply("❌ *පරිවර්තනය අසාර්ථක විය.*");
        }
    },
);

cmd(
    {
        pattern: "owner",
        alias: ["developer", "dev"],
        react: "👑",
        desc: "Get Owner Details.",
        category: "main",
        filename: __filename,
    },
    async (zanta, mek, m, { from, reply, userSettings }) => {
        try {
            const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
            const botName =
                settings.botName || config.DEFAULT_BOT_NAME || "ZANTA-MD";

            // ලෝගෝ එක Buffer එකක් ලෙස ලබා ගැනීම
            let logoRes = await axios.get(
                "https://github.com/Akashkavindu/ZANTA_MD/blob/main/images/Gemini_Generated_Image_4xcl2e4xcl2e4xcl.png?raw=true",
                { responseType: "arraybuffer" },
            );
            let logoBuffer = Buffer.from(logoRes.data, "binary");

            // ඔයාගේ විස්තර මෙතන ලස්සනට දාන්න පුළුවන්
            let ownerMsg = `👑 *|${botName.toUpperCase()} OWNER INFO|* 👑

👤 *Name:* Akash kavindu
🌍 *Location:* Sri Lanka 🇱🇰
📱 *WhatsApp:* 94743404814

📢 *Join our Channel:* https://whatsapp.com/channel/0029VbBc42s84OmJ3V1RKd2B

> *©️ 𝐙𝐀𝐍𝐓𝐀 𝐎𝐅𝐂*`;

            // මැසේජ් එක යැවීම
            await zanta.sendMessage(
                from,
                {
                    image: logoBuffer, // ඔයාගේ ලෝගෝ එකම මේකටත් පාවිච්චි කළා
                    caption: ownerMsg,
                },
                { quoted: mek },
            );
        } catch (e) {
            reply(`❌ *Error:* ${e.message}`);
        }
    },
);

cmd(
    {
        pattern: "directdl",
        alias: ["download", "ddl"],
        react: "📥",
        category: "download",
        desc: "Download files from a direct link.",
        filename: __filename,
    },
    async (zanta, mek, m, { from, q, reply }) => {
        if (!q)
            return reply(
                "❌ කරුණාකර Direct Download Link එකක් ලබා දෙන්න.\n\n*Ex:* .directdl https://example.com/file.pdf",
            );

        // Link එක valid ද කියලා check කිරීම
        const urlPattern = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
        if (!urlPattern.test(q))
            return reply(
                "❌ ලබා දුන් Link එක වැරදියි. කරුණාකර නිවැරදි Link එකක් ලබා දෙන්න.",
            );

        try {
            await reply("⏳ *Downloading your file... Please wait.*");

            // File එකේ නම link එකෙන් ලබා ගැනීම
            const fileName =
                q.substring(q.lastIndexOf("/") + 1) || "downloaded_file";

            // File එක download කර buffer එකකට ගැනීම
            const response = await axios.get(q, {
                responseType: "arraybuffer",
            });
            const buffer = Buffer.from(response.data, "binary");

            // File size එක check කිරීම (WhatsApp සාමාන්‍යයෙන් 100MB වලට වඩා එවනකොට ගැටලු ඇති වෙන්න පුළුවන්)
            const fileSizeMB = buffer.length / (1024 * 1024);
            if (fileSizeMB > 150) {
                return reply(
                    `⚠️ ගොනුවේ ප්‍රමාණය වැඩියි (${fileSizeMB.toFixed(2)} MB). WhatsApp හරහා එවිය හැක්කේ 150MB ට අඩු ගොනු පමණි.`,
                );
            }

            // File එක Document එකක් විදිහට යැවීම
            await zanta.sendMessage(
                from,
                {
                    document: buffer,
                    fileName: fileName,
                    mimetype:
                        response.headers["content-type"] ||
                        "application/octet-stream",
                    caption: `✅ *File Downloaded Successfully!*\n\n📂 *Name:* ${fileName}\n⚖️ *Size:* ${fileSizeMB.toFixed(2)} MB\n\n> *Generated by ZANTA-MD*`,
                },
                { quoted: mek },
            );
        } catch (e) {
            console.error(e);
            reply(
                "❌ ගොනුව බාගත කිරීමට නොහැකි විය. Link එක වැඩ කරන්නේ නැති හෝ Server එක මගින් block කර ඇති එකක් විය හැක.",
            );
        }
    },
);
