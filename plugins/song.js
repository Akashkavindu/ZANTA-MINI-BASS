const { cmd } = require("../command");
const { ytmp3, ytmp4 } = require("sadaslk-dlcore");
const yts = require("yt-search");

async function getYoutube(query) {
  const isUrl = /(youtube\.com|youtu\.be)/i.test(query);
  if (isUrl) {
    const id = query.split("v=")[1]?.split("&")[0] || query.split("/").pop();
    const info = await yts({ videoId: id });
    return info;
  }
  const search = await yts(query);
  return search.videos.length ? search.videos[0] : null;
}

cmd({
    pattern: "song",
    alias: ["yta", "mp3"],
    desc: "Download YouTube MP3",
    category: "download",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("🎵 Send song name or YouTube link");

        reply("🔎 Searching YouTube...");
        const video = await getYoutube(q);
        if (!video) return reply("❌ No results found");

        const caption = `🎵 *${video.title}*\n👤 Channel: ${video.author.name}\n⏱ Duration: ${video.timestamp}\n👀 Views: ${video.views.toLocaleString()}\n🔗 ${video.url}`;

        await bot.sendMessage(from, { image: { url: video.thumbnail }, caption }, { quoted: mek });

        // මෙතනදී කෙලින්ම ඩවුන්ලෝඩ් එක පටන් ගන්නවා
        const data = await ytmp3(video.url);
        if (!data?.url) return reply("❌ Failed to download MP3. Try again later.");

        await bot.sendMessage(from, { 
            audio: { url: data.url }, 
            mimetype: "audio/mpeg" 
        }, { quoted: mek });

    } catch (e) {
        console.log("YTMP3 ERROR:", e);
        reply("❌ Error while downloading MP3");
    }
});

cmd({
    pattern: "ytmp4",
    alias: ["ytv", "video"],
    desc: "Download YouTube MP4",
    category: "download",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("🎬 Send video name or link");

        reply("🔎 Searching YouTube...");
        const video = await getYoutube(q);
        if (!video) return reply("❌ No results found");

        const caption = `🎬 *${video.title}*\n👤 Channel: ${video.author.name}\n⏱ Duration: ${video.timestamp}\n🔗 ${video.url}`;

        await bot.sendMessage(from, { image: { url: video.thumbnail }, caption }, { quoted: mek });

        const data = await ytmp4(video.url, {
            format: "mp4",
            videoQuality: "360",
        });

        if (!data?.url) return reply("❌ Failed to download video");

        await bot.sendMessage(from, {
            video: { url: data.url },
            mimetype: "video/mp4",
            fileName: `${video.title}.mp4`,
            caption: "🎬 YouTube video",
        }, { quoted: mek });

    } catch (e) {
        console.log("YTMP4 ERROR:", e);
        reply("❌ Error while downloading video");
    }
});
