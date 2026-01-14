const { cmd } = require("../command");
const yts = require("yt-search");
const fs = require("fs");
const { getAudioFile, getVideoFile } = require("../api/song"); // api/song.js එකේ නම් වලට ගැලපෙන්න ගත්තා

// YouTube සොයාගැනීමේ පොදු function එක
async function getYoutube(query) {
  const isUrl = /(youtube\.com|youtu\.be)/i.test(query);
  if (isUrl) {
    const id = query.split("v=")[1] || query.split("/").pop();
    const info = await yts({ videoId: id });
    return info;
  }
  const search = await yts(query);
  if (!search.videos.length) return null;
  return search.videos[0];
}

// --- SONG DOWNLOADER (MP3) ---
cmd(
  {
    pattern: "song",
    alias: ["yta", "ytmp3"],
    desc: "Download YouTube MP3 via Custom API",
    category: "download",
    filename: __filename,
  },
  async (bot, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("🎵 *කරුණාකර සින්දුවක නමක් හෝ ලින්ක් එකක් ලබා දෙන්න.*");

      await m.react("🔍");
      const video = await getYoutube(q);
      if (!video) return reply("❌ *ප්‍රතිඵල හමු නොවීය.*");

      // මෙන්න ලස්සනට හදපු අලුත් Caption එක
      const caption = `
✨ *ᴢᴀɴᴛᴀ-ᴍᴅ sᴏɴɢ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* ✨

📝 *ᴛɪᴛʟᴇ:* ${video.title}
👤 *ᴄʜᴀɴɴᴇʟ:* ${video.author.name}
🕒 *ᴅᴜʀᴀᴛɪᴏɴ:* ${video.timestamp}
👁️ *ᴠɪᴇᴡs:* ${video.views.toLocaleString()}
🔗 *ʟɪɴᴋ:* ${video.url}

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴢᴀɴᴛᴀ-ᴍᴅ*`;

      // විස්තර පණිවිඩය යැවීම
      await bot.sendMessage(from, { image: { url: video.thumbnail }, caption }, { quoted: mek });

      await m.react("📥");

      // API එකෙන් සින්දුව ලබා ගැනීම
      const data = await getAudioFile(video.url);

      if (!data.status || !data.filePath) {
          return reply("❌ *සින්දුව බාගත කිරීමේදී දෝෂයක් ඇති විය.*");
      }

      // Audio එක යැවීම
      await bot.sendMessage(
        from,
        {
          audio: fs.readFileSync(data.filePath), 
          mimetype: "audio/mpeg",
          fileName: `${video.title}.mp3`
        },
        { quoted: mek }
      );

      // සර්වර් එකේ ෆයිල් එක මැකීම
      fs.unlinkSync(data.filePath);
      await m.react("✅");

    } catch (e) {
      console.log("YTMP3 ERROR:", e);
      reply("❌ *දෝෂයක් සිදු විය:* " + e.message);
    }
  }
);

// --- VIDEO DOWNLOADER (MP4) ---
cmd(
  {
    pattern: "video",
    alias: ["ytv", "ytmp4"],
    desc: "Download YouTube MP4 via Custom API",
    category: "download",
    filename: __filename,
  },
  async (bot, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("🎬 Send video name or YouTube link");

      await m.react("🔍");
      const video = await getYoutube(q);
      if (!video) return reply("❌ No results found");

      const caption =
        `🎬 *${video.title}*\n\n` +
        `⏱ Duration: ${video.timestamp}\n` +
        `🔗 ${video.url}\n\n> *Powered by Zanta-MD Custom API*`;

      await bot.sendMessage(from, { image: { url: video.thumbnail }, caption }, { quoted: mek });

      await m.react("📥");

      // මෙතනgetVideoFile භාවිතා කළ යුතුයි
      const data = await getVideoFile(video.url); 

      if (!data.status || !data.filePath) return reply("❌ Failed to download video file.");

      await bot.sendMessage(
        from,
        {
          video: fs.readFileSync(data.filePath), // File එක කියවීම
          mimetype: "video/mp4",
          caption: `🎬 ${video.title}`,
        },
        { quoted: mek }
      );

      // යැවූ පසු සර්වර් එකේ ෆයිල් එක මැකීම
      fs.unlinkSync(data.filePath);
      await m.react("✅");

    } catch (e) {
      console.log("YTMP4 ERROR:", e);
      reply("❌ Error while downloading video");
    }
  }
);

cmd(
  {
    pattern: "gsong",
    alias: ["google-song", "isong"],
    desc: "Download MP3 with a premium look",
    category: "download",
    filename: __filename,
  },
  async (bot, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("🎼 *කරුණාකර සින්දුවක නමක් හෝ ලින්ක් එකක් ලබා දෙන්න.*");

      await m.react("🔍");

      const video = await getYoutube(q);
      if (!video) return reply("❌ *ප්‍රතිඵල හමු නොවීය. කරුණාකර වෙනත් නමක් උත්සාහ කරන්න.*");

      // ලස්සනට සකස් කළ විස්තර පණිවිඩය (Premium Caption)
      const premiumCaption = `
✨ *ᴢᴀɴᴛᴀ-ᴍᴅ sᴏɴɢ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* ✨

📝 *ᴛɪᴛʟᴇ:* ${video.title}
👤 *ᴀᴜᴛʜᴏʀ:* ${video.author.name}
🕒 *ᴅᴜʀᴀᴛɪᴏɴ:* ${video.timestamp}
👁️ *ᴠɪᴇᴡs:* ${video.views.toLocaleString()}
📅 *ᴜᴘʟᴏᴀᴅᴇᴅ:* ${video.ago}
🔗 *ʟɪɴᴋ:* ${video.url}

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴢᴀɴᴛᴀ-ᴍᴅ ᴀᴘɪ*`;

      // මුලින්ම විස්තර සහිත පින්තූරය යැවීම
      await bot.sendMessage(
        from, 
        { 
          image: { url: video.thumbnail }, 
          caption: premiumCaption 
        }, 
        { quoted: mek }
      );

      await m.react("📥");

      // API එක හරහා සින්දුව ලබා ගැනීම
      const data = await getAudioFile(video.url);

      if (!data.status || !data.filePath) {
          return reply("❌ *සින්දුව බාගත කිරීමේදී දෝෂයක් ඇති විය.*");
      }

      // සින්දුව Audio File එකක් ලෙස යැවීම
      await bot.sendMessage(
        from,
        {
          audio: fs.readFileSync(data.filePath),
          mimetype: "audio/mpeg",
          fileName: `${video.title}.mp3`
        },
        { quoted: mek }
      );


      fs.unlinkSync(data.filePath);
      await m.react("✅");

    } catch (e) {
      console.log("GSONG ERROR:", e);
      reply("❌ *දෝෂයක් සිදු විය:* " + e.message);
    }
  }
);
