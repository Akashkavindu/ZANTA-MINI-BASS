const { cmd } = require("../command");
const fs = require('fs');
const path = require('path');
const figlet = require('figlet');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const FormData = require('form-data');

ffmpeg.setFfmpegPath(ffmpegPath);

const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const REMOVE_BG_API_KEY = "vGc2DJRV25qEAWbU26YaQV2R"; 

/**
 * Streaming download - RAM එක ඉතිරි කරයි
 */
const downloadMedia = async (message, type) => {
    try {
        const stream = await downloadContentFromMessage(message, type);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    } catch (e) { return null; }
};

const getMedia = (quoted) => {
    if (!quoted) return null;
    let msg = quoted.message || quoted.msg || quoted;
    if (msg.imageMessage) return { data: msg.imageMessage, type: 'image' };
    if (msg.videoMessage) return { data: msg.videoMessage, type: 'video' };
    if (msg.stickerMessage) return { data: msg.stickerMessage, type: 'sticker' };
    return null;
};

// 1. Sticker Maker (Optimized)
cmd({
    pattern: "s",
    alias: ["sticker", "st"],
    react: "🌟",
    category: "convert",
    filename: __filename,
}, async (zanta, mek, m, { from, reply, quoted }) => {
    let inPath, outPath;
    try {
        let media = getMedia(quoted);
        if (!media) return reply("*ඡායාරූපයකට හෝ වීඩියෝවකට Reply කරන්න!*");

        const buffer = await downloadMedia(media.data, media.type);
        inPath = path.join(tempDir, `temp_${Date.now()}`);
        outPath = path.join(tempDir, `st_${Date.now()}.webp`);
        fs.writeFileSync(inPath, buffer);

        ffmpeg(inPath)
            .inputOptions(['-t 10']) // තත්පර 10කට සීමා කිරීම (RAM එක බේරීමට)
            .addOutputOptions(["-vcodec", "libwebp", "-vf", "scale=320:320:force_original_aspect_ratio=decrease,pad=320:320:(320-iw)/2:(320-ih)/2:color=white@0.0"])
            .on('end', async () => {
                await zanta.sendMessage(from, { sticker: fs.readFileSync(outPath), packname: "ZANTA-MD", author: "Bot" }, { quoted: mek });
                if (fs.existsSync(inPath)) fs.unlinkSync(inPath);
                if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
            })
            .save(outPath);
    } catch (e) { reply("Error!"); }
});

// 2. Video to MP3 (RAM Safe Streaming)
cmd({
    pattern: "tomp3",
    react: "🎶",
    category: "convert",
    filename: __filename,
}, async (zanta, mek, m, { from, reply, quoted }) => {
    let inPath, outPath;
    try {
        let media = getMedia(quoted);
        if (!media || media.type !== 'video') return reply("*වීඩියෝවකට Reply කරන්න!*");

        reply("*MP3 එක සාදමින් පවතී...* ⏳");
        const buffer = await downloadMedia(media.data, 'video');
        inPath = path.join(tempDir, `vid_${Date.now()}.mp4`);
        outPath = path.join(tempDir, `aud_${Date.now()}.mp3`);
        fs.writeFileSync(inPath, buffer);

        ffmpeg(inPath)
            .toFormat('mp3')
            .audioBitrate('128k')
            .on('end', async () => {
                // Stream එකක් ලෙස යැවීමෙන් RAM එක බේරාගැනීම
                await zanta.sendMessage(from, { 
                    audio: fs.readFileSync(outPath), 
                    mimetype: 'audio/mpeg', 
                    fileName: `ZANTA.mp3` 
                }, { quoted: mek });
                
                if (fs.existsSync(inPath)) fs.unlinkSync(inPath);
                if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
            })
            .save(outPath);
    } catch (e) { reply("Error!"); }
});

// AI Image Generator (Pollinations - No RAM Load)
cmd({
    pattern: "genimg",
    react: "🎨",
    category: "media",
    filename: __filename,
}, async (zanta, mek, m, { from, reply, args }) => {
    try {
        let text = args.join(" ");
        if (!text) return reply("*විස්තරයක් ලබා දෙන්න!*");
        
        reply("*නිර්මාණය කරමින් පවතී...* ⏳");
        let apiUrl = `https://pollinations.ai/p/${encodeURIComponent(text)}?width=1024&height=1024&seed=${Math.floor(Math.random() * 1000)}`;

        // කෙලින්ම URL එක යැවීම නිසා බොට්ට බරක් නැත
        await zanta.sendMessage(from, { 
            image: { url: apiUrl }, 
            caption: `*🎨 AI Generated:* ${text}` 
        }, { quoted: mek });
    } catch (e) { reply("Error!"); }
});
