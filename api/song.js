const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function getAudioFile(url) {
    const fileName = `temp_${Date.now()}.mp3`;
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, fileName);

    try {
        console.log("🚀 Trying Premium Scraper for:", url);

        // මේක දැනට තියෙන stable ම API එකක් (Aura API)
        const response = await axios.get(`https://aura-api-ix68.onrender.com/api/ytdl?url=${encodeURIComponent(url)}`);
        
        const dlUrl = response.data?.data?.mp3 || response.data?.mp3;

        if (dlUrl) {
            console.log("📥 Scraper Success! Downloading...");
            const writer = fs.createWriteStream(filePath);
            const stream = await axios({
                url: dlUrl,
                method: 'GET',
                responseType: 'stream'
            });

            stream.data.pipe(writer);

            return new Promise((resolve) => {
                writer.on('finish', () => {
                    console.log("✅ File Saved!");
                    resolve({ status: true, filePath: filePath });
                });
                writer.on('error', () => resolve({ status: false }));
            });
        } else {
            throw new Error("No link found");
        }
    } catch (e) {
        console.log("⚠️ Scraper 1 failed, trying Final Bypass...");
        try {
            // මේක තවත් bypass API එකක්
            const res2 = await axios.get(`https://api.zenkey.my.id/api/download/ytmp3?url=${encodeURIComponent(url)}&apikey=zenkey`);
            const dlUrl2 = res2.data?.result?.download_url || res2.data?.result?.url;

            if (dlUrl2) {
                const response = await axios({ url: dlUrl2, method: 'GET', responseType: 'stream' });
                const writer = fs.createWriteStream(filePath);
                response.data.pipe(writer);
                return new Promise((resolve) => {
                    writer.on('finish', () => resolve({ status: true, filePath: filePath }));
                    writer.on('error', () => resolve({ status: false }));
                });
            }
        } catch (err) {
            return { status: false, error: "All methods failed." };
        }
    }
}

async function getVideoFile(url) {
    // වීඩියෝ එකටත් ඒ වගේම stable API එකක් දාමු
    const fileName = `temp_vid_${Date.now()}.mp4`;
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, fileName);

    try {
        const response = await axios.get(`https://aura-api-ix68.onrender.com/api/ytdl?url=${encodeURIComponent(url)}`);
        const dlUrl = response.data?.data?.mp4 || response.data?.mp4;
        if (dlUrl) {
            const res = await axios({ url: dlUrl, method: 'GET', responseType: 'stream' });
            const writer = fs.createWriteStream(filePath);
            res.data.pipe(writer);
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
