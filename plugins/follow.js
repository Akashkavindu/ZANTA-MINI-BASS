const { cmd } = require('../command');

cmd({
    pattern: "follow",
    alias: ["massfollow", "chfollow"],
    react: "📢",
    desc: "Make all active bots follow a specific newsletter/channel.",
    category: "main",
    use: ".follow <channel_link>",
    filename: __filename,
},
async (conn, mek, m, { q, reply, sender, userSettings }) => {

    const allowedNumbers = [
        "94771810698", "94743404814", "94766247995", 
        "192063001874499", "270819766866076"
    ];

    const senderNumber = sender.split("@")[0].replace(/[^\d]/g, '');
    const isOwner = allowedNumbers.includes(senderNumber);
    const isPaidUser = userSettings && userSettings.paymentStatus === "paid";

    // අවසර පරීක්ෂාව
    if (!isOwner && !isPaidUser) {
        return reply(`🚫 අවසර නැත!\n\nමෙම පහසුකම භාවිතා කිරීමට ඔබ Paid User කෙනෙකු විය යුතුය.`);
    }

    // ලින්ක් එක තිබේදැයි පරීක්ෂාව
    if (!q) return reply("💡 Usage: .follow https://whatsapp.com/channel/xxxxxx");

    try {
        // චැනල් ලින්ක් එකෙන් invite කෝඩ් එක වෙන් කරගැනීම
        const urlParts = q.trim().split("/");
        const channelInvite = urlParts[urlParts.length - 1];

        if (!channelInvite) {
            return reply("❌ වලංගු Newsletter Link එකක් ලබා දෙන්න!");
        }

        // චැනල් එකේ Metadata ලබාගෙන JID එක සොයා ගැනීම
        const res = await conn.newsletterMetadata("invite", channelInvite);
        const targetJid = res.id;
        const channelName = res.name || "this channel";

        const allBots = Array.from(global.activeSockets || []);

        if (allBots.length === 0) {
            return reply("❌ සක්‍රීය සෙෂන්ස් කිසිවක් හමු නොවීය!");
        }

        reply(`🚀 *Mass Follow Started!* ✅\n\n📢 *Channel:* ${channelName}\n👥 *Total Bots:* ${allBots.length}\n\n> *Processing all bots instantly...*`);

        // Promise.all මගින් සියලුම බොට්ලා ලවා එකවර Follow කරවීම (No Delay)
        await Promise.all(allBots.map(async (botSocket, index) => {
            try {
                if (botSocket && typeof botSocket.newsletterFollow === 'function') {
                    await botSocket.newsletterFollow(targetJid);
                }
            } catch (err) {
                console.log(`❌ Bot ${index} Follow Error:`, err.message);
            }
        }));

        return reply(`✅ *Success!* All active bots are now following *${channelName}*.`);

    } catch (e) {
        console.error(e);
        reply("❌ දෝෂයක් සිදු විය: " + e.message);
    }
});
