const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function getAudioFile(url) {
    const fileName = `temp_${Date.now()}.mp3`;
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, fileName);

    // දැනට වැඩ කරන සුපිරිම API 2ක්
    const apis = [
        `https://widipe.com/download/ytdl?url=${encodeURIComponent(url)}`,
        `https://api.sipendl.com/api/v1/yt/download?url=${encodeURIComponent(url)}&type=mp3`
    ];

    console.log("🚀 Trying Direct APIs...");

    for (let apiUrl of apis) {
        try {
            const res = await axios.get(apiUrl, { timeout: 10000 });
            
            // විවිධ API වල ප්‍රතිඵල එන විදිහට අනුව URL එක ගන්නවා
            let dlUrl = res.data?.result?.url || res.data?.result?.downloadUrl;

            if (dlUrl) {
                console.log("📥 API Success! Downloading to VPS...");
                const response = await axios({ url: dlUrl, method: 'GET', responseType: 'stream' });
                const writer = fs.createWriteStream(filePath);
                response.data.pipe(writer);

                return new Promise((resolve) => {
                    writer.on('finish', () => resolve({ status: true, filePath: filePath }));
                    writer.on('error', () => resolve({ status: false }));
                });
            }
        } catch (e) {
            console.log("⚠️ API Skip...");
            continue;
        }
    }
    return { status: false, error: "සියලුම සේවා බිඳ වැටී ඇත." };
}

// Video එකටත් මේ විදිහටම API එක දාමු
async function getVideoFile(url) {
    const fileName = `temp_vid_${Date.now()}.mp4`;
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, fileName);

    try {
        const res = await axios.get(`https://widipe.com/download/ytdl?url=${encodeURIComponent(url)}`);
        const dlUrl = res.data?.result?.url; // Video URL එක

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
