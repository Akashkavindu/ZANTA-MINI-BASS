const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const execPromise = promisify(exec);

async function getAudioFile(url) {
    try {
        const fileName = `temp_${Date.now()}.mp3`;
        const tempDir = path.join(__dirname, '..', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const filePath = path.join(tempDir, fileName); 

        // Frankfurt VPS එකේදී cookies අවශ්‍ය නැත. සරල command එකක් පාවිච්චි කරමු.
        const cmd = `yt-dlp --force-ipv4 --no-check-certificates "${url}" -x --audio-format mp3 -o "${filePath}"`;

        await execPromise(cmd);
        return { status: true, filePath: filePath };
    } catch (e) {
        console.error("YT-DLP Audio Error:", e);
        return { status: false, error: e.message };
    }
}

async function getVideoFile(url) {
    try {
        const fileName = `temp_vid_${Date.now()}.mp4`;
        const tempDir = path.join(__dirname, '..', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const filePath = path.join(tempDir, fileName);

        const cmd = `yt-dlp --force-ipv4 --no-check-certificates "${url}" -f "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480]/best" --recode-video mp4 -o "${filePath}"`;

        await execPromise(cmd);
        return { status: true, filePath: filePath };
    } catch (e) {
        console.error("YT-DLP Video Error:", e);
        return { status: false, error: e.message };
    }
}

module.exports = { getAudioFile, getVideoFile };
