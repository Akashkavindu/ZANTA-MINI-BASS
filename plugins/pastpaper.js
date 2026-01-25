const { cmd } = require("../command");
const axios = require("axios");
const cheerio = require("cheerio");
const config = require("../config");

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

        // සයිට් කිහිපයක් පරීක්ෂා කිරීම (More reliable)
        const searchSources = [
            `https://pastpapers.wiki/?s=${encodeURIComponent(q)}`,
            `https://pastpapers.lk/?s=${encodeURIComponent(q)}`
        ];

        let title = null, postLink = null, pdfLink = null;

        for (let url of searchSources) {
            try {
                const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
                const $ = cheerio.load(data);
                const first = $(".post-item, .post").first(); // සයිට් දෙකේම පෝස්ට් හඳුනාගන්න
                
                title = first.find(".post-title a, .entry-title a").first().text().trim();
                postLink = first.find(".post-title a, .entry-title a").first().attr("href");

                if (postLink) {
                    const { data: pData } = await axios.get(postLink);
                    const $$ = cheerio.load(pData);
                    pdfLink = $$('a.wp-block-button__link').attr('href') || 
                              $$('a[href$=".pdf"]').first().attr('href');
                    
                    if (pdfLink) break; // PDF එක හමු වුණොත් loop එක නතර කරනවා
                }
            } catch (err) { continue; }
        }

        if (!pdfLink) {
            return await zanta.sendMessage(from, { text: "❌ කිසිදු සෘජු ප්‍රශ්න පත්‍රයක් හමු නොවීය. කරුණාකර විෂය නාමය ඉංග්‍රීසියෙන් (English) නිවැරදිව ලබා දෙන්න.", edit: loading.key });
        }

        const settings = userSettings || global.CURRENT_BOT_SETTINGS || {};
        const botName = settings.botName || config.DEFAULT_BOT_NAME || "𝒁𝑨𝑵𝑻𝑨-𝑴𝑫";

        const contextInfo = {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: CHANNEL_JID,
                serverMessageId: 100,
                newsletterName: "𝒁𝑨𝑵𝑻𝑨-𝑴𝑫 𝑶𝑭𝑭𝑰𝑪𝑰𝑨𝑳 </>"
            }
        };

        await zanta.sendMessage(from, {
            document: { url: pdfLink },
            fileName: `${title || q}.pdf`,
            mimetype: "application/pdf",
            caption: `📑 *𝒁𝑨𝑵𝑻𝑨-𝑴𝑫 𝑷𝑨𝑺𝑻 𝑷𝑨𝑷𝑬𝑹* 📑\n\n` +
                     `📂 *File:* ${title || q}\n` +
                     `🚀 *Status:* Success\n\n` +
                     `> *© 𝑷𝒐𝒘𝒆𝒓𝒆𝒅 𝑩𝒚 ${botName}*`,
            contextInfo: contextInfo
        }, { quoted: mek });

        await zanta.sendMessage(from, { text: "✅ *Upload Completed!*", edit: loading.key });

    } catch (e) {
        console.error(e);
        await zanta.sendMessage(from, { text: `❌ සර්වර් දෝෂයක් සිදු විය: ${e.message}` });
    }
});
