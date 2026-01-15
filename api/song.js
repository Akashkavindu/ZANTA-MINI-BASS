const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function getAudioFile(url) {
    const fileName = `temp_${Date.now()}.mp3`;
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, fileName);

    try {
        console.log("🚀 Trying Guru Premium API for:", url);
        
        // මේක තමයි දැනට තියෙන වැඩ කරනම සහ වේගවත්ම API එක
        const res = await axios.get(`https://api.guruapi.tech/ytdl/ytmp3?url=${encodeURIComponent(url)}`);
        
        // Guru API එකේ link එක එන්නේ result.download_url විදිහට
        const dlUrl = res.data?.result?.download_url || res.data?.download_url;

        if (dlUrl) {
            console.log("📥 Guru API Success! Downloading...");
            const response = await axios({
                url: dlUrl,
                method: 'GET',
                responseType: 'stream',
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            return new Promise((resolve) => {
                writer.on('finish', () => {
                    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
                        console.log("✅ Audio Saved!");
                        resolve({ status: true, filePath: filePath });
                    } else {
                        resolve({ status: false });
                    }
                });
                writer.on('error', () => resolve({ status: false }));
            });
        } else {
            throw new Error("Link not found in Guru API");
        }
    } catch (e) {
        console.error("❌ Guru API Error:", e.message);
        return { status: false, error: "API down" };
    }
}

async function getVideoFile(url) {
    const fileName = `temp_vid_${Date.now()}.mp4`;
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, fileName);

    try {
        const res = await axios.get(`https://api.guruapi.tech/ytdl/ytmp4?url=${encodeURIComponent(url)}`);
        const dlUrl = res.data?.result?.download_url;

        if (dlUrl) {
            const response = await axios({ url: dlUrl, method: 'GET', responseType: 'stream' });
            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);
            return new Promise((resolve) => {
                writer.on('finish', () => resolve({ status: true, filePath: filePath }));
                writer.on('error', () => resolve({ status: false }));
            });
        }
    } catch (e) {
        return { status: false };
    }
}

module.exports = { getAudioFile, getVideoFile };
