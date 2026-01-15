const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const execPromise = promisify(exec);

async function getAudioFile(url) {
    const fileName = `temp_${Date.now()}.mp3`;
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, fileName);
    
    // ප්‍රධාන folder එකේ තියෙන cookies.txt file එක ගමු
    const cookiePath = path.join(__dirname, '..', 'cookies.txt');

    try {
        console.log("🚀 Downloading with Cookies from Frankfurt...");
        
        // --cookies-from-browser වෙනුවට කෙලින්ම file එක දෙනවා
        const cmd = `yt-dlp --cookies "${cookiePath}" --force-ipv4 --no-check-certificates "${url}" -x --audio-format mp3 -o "${filePath}"`;

        await execPromise(cmd);
        return { status: true, filePath: filePath };

    } catch (e) {
        console.error("YT-DLP Error:", e.message);
        return { status: false, error: "Cookies සමඟත් බ්ලොක් වී ඇත හෝ දෝෂයකි." };
    }
}

async function getVideoFile(url) {
    const fileName = `temp_vid_${Date.now()}.mp4`;
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, fileName);
    const cookiePath = path.join(__dirname, '..', 'cookies.txt');

    try {
        const cmd = `yt-dlp --cookies "${cookiePath}" --force-ipv4 --no-check-certificates "${url}" -f "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480]/best" --recode-video mp4 -o "${filePath}"`;
            
        await execPromise(cmd);
        return { status: true, filePath: filePath };
    } catch (e) {
        return { status: false, error: e.message };
    }
}

module.exports = { getAudioFile, getVideoFile };
