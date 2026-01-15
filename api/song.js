const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const execPromise = promisify(exec);

// cookies.txt ෆයිල් එක තිබුණොත් පාවිච්චි කරන්න පාර හදාගන්නවා
const cookiesPath = path.join(__dirname, '..', 'cookies.txt');

async function getAudioFile(url) {
    try {
        const fileName = `temp_${Date.now()}.mp3`;
        const filePath = path.join(__dirname, '..', 'temp', fileName); 

        const cookiesArg = fs.existsSync(cookiesPath) ? `--cookies "${cookiesPath}"` : "";

        // YouTube එකට අපි ඇන්ඩ්‍රොයිඩ් ඇප් එකක් කියලා අඟවන්න මේ extractor-args පාවිච්චි කරනවා
        // මේකෙන් Cookies නැතුව වුණත් ගොඩක් වෙලාවට වැඩ කරනවා
        const extraArgs = `--extractor-args "youtube:player_client=android,web;player_skip=webpage,configs"`;
        const userAgent = `--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"`;

        const cmd = `yt-dlp ${cookiesArg} ${extraArgs} ${userAgent} "${url}" -x --audio-format mp3 -o "${filePath}"`;

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
        const filePath = path.join(__dirname, '..', 'temp', fileName);

        const cookiesArg = fs.existsSync(cookiesPath) ? `--cookies "${cookiesPath}"` : "";
        const extraArgs = `--extractor-args "youtube:player_client=android,web;player_skip=webpage,configs"`;
        const userAgent = `--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"`;

        const cmd = `yt-dlp ${cookiesArg} ${extraArgs} ${userAgent} "${url}" -f "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480]/best" --recode-video mp4 -o "${filePath}"`;

        await execPromise(cmd);
        return { status: true, filePath: filePath };
    } catch (e) {
        console.error("YT-DLP Video Error:", e);
        return { status: false, error: e.message };
    }
}

module.exports = { getAudioFile, getVideoFile };
