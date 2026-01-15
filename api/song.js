const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function getAudioFile(url) {
    const fileName = `temp_${Date.now()}.mp3`;
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, fileName);

    try {
        console.log("🚀 Trying Universal Bypass API...");
        
        // මේක ලෝකේ ප්‍රබලම Bypass API එකක්
        const res = await axios.get(`https://api.vreden.my.id/api/ytdl?url=${encodeURIComponent(url)}`);
        
        // MP3 link එක තියෙන්නේ result.mp3 ඇතුළේ
        const dlUrl = res.data?.result?.mp3 || res.data?.result?.downloadUrl;

        if (dlUrl) {
            console.log("📥 API Success! Downloading to VPS...");
            const response = await axios({ url: dlUrl, method: 'GET', responseType: 'stream' });
            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            return new Promise((resolve) => {
                writer.on('finish', () => {
                    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
                        console.log("✅ Downloaded Successfully!");
                        resolve({ status: true, filePath: filePath });
                    } else {
                        resolve({ status: false });
                    }
                });
                writer.on('error', () => resolve({ status: false }));
            });
        }
    } catch (e) {
        console.error("❌ Bypass API Error:", e.message);
        return { status: false };
    }
}

async function getVideoFile(url) {
    const fileName = `temp_vid_${Date.now()}.mp4`;
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, fileName);

    try {
        const res = await axios.get(`https://api.vreden.my.id/api/ytdl?url=${encodeURIComponent(url)}`);
        const dlUrl = res.data?.result?.mp4 || res.data?.result?.mv4;

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
