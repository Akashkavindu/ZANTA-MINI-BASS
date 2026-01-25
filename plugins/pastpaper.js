const { cmd } = require("../command");
const axios = require("axios");
const cheerio = require("cheerio");
const config = require("../config");

// චැනල් JID එක මෙතන සඳහන් කරන්න (හෝ config එකෙන් ගන්න)
const CHANNEL_JID = "120363233854483997@newsletter"; 

cmd({
    pattern: "paper",
    alias: ["pastpaper", "exam"],
    desc: "Auto search and download past papers.",
    category: "download",
    react: "📑",
    filename: __filename,
}, async (zanta, mek, m, { from, reply, q, prefix, userSettings }) => {
    try {
        if (!q) return reply(`⚠️ කරුණාකර විෂය සහ වසර සඳහන් කරන්න.\n\n*E.g:* \`${prefix}pastpaper 2023 A/L Physics\``);

        const loading = await zanta.sendMessage(from, { text: `🔍 *"${q}" සොයමින් පවතී...*` }, { quoted: mek });

        // 1. PastPapers.wiki හරහා සෙවීම
        const searchUrl = `https://pastpapers.wiki/?s=${encodeURIComponent(q)}`;
        const { data: searchData } = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        
        const $ = cheerio.load(searchData);
        const firstResult = $(".post-item").first();
        const title = firstResult.find(".post-title a").text().trim();
        const postLink = firstResult.find(".post-title a").attr("href");

        if (!title || !postLink) {
            return await zanta.sendMessage(from, { text: "❌ කිසිදු ප්‍රතිඵලයක් හමු නොවීය. කරුණාකර නිවැරදි නම ලබා දෙන්න.", edit: loading.key });
        }

        // 2. පේජ් එක ඇතුළට ගොස් PDF ලින්ක් එක සෙවීම
        const { data: pageData } = await axios.get(postLink);
        const $$ = cheerio.load(pageData);
        
        // PDF ලින්ක් එක හඳුනාගැනීම
        let pdfLink = $$('a.wp-block-button__link').attr('href') || 
                      $$('a[href$=".pdf"]').first().attr('href');

        if (!pdfLink) {
            return await zanta.sendMessage(from, { text: `❌ සෘජු PDF එකක් හමු නොවීය. මූලාශ්‍රය: ${postLink}`, edit: loading.key });
        }

        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "𝒁𝑨𝑵𝑻𝑨-𝑴𝑫";

        // Forward Info Setup
        const contextInfo = {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: CHANNEL_JID,
                serverMessageId: 100,
                newsletterName: "𝒁𝑨𝑵𝑻𝑨-𝑴𝑫 𝑶𝑭𝑭𝑰𝑪𝑰𝑨𝑳 </>"
            }
        };

        // 3. PDF එක යැවීම
        await zanta.sendMessage(from, {
            document: { url: pdfLink },
            fileName: `${title}.pdf`,
            mimetype: "application/pdf",
            caption: `📑 *𝒁𝑨𝑵𝑻𝑨-𝑴𝑫 𝑷𝑨𝑷𝑬𝑹* 📑\n\n` +
                     `📂 *File Name:* ${title}\n` +
                     `📎 *Source:* PastPapers.wiki\n` +
                     `🚀 *Status:* Successfully Downloaded\n\n` +
                     `> *© 𝑷𝒐𝒘𝒆𝒓𝒆𝒅 𝑩𝒚 ${botName}*`,
            contextInfo: contextInfo
        }, { quoted: mek });

        // Loading message එක අයින් කිරීම
        await zanta.sendMessage(from, { text: "✅ *Done!*", edit: loading.key });

    } catch (e) {
        console.error(e);
        await zanta.sendMessage(from, { text: `❌ දෝෂයක් සිදු විය: ${e.message}` });
    }
});
