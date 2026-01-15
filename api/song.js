const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const execPromise = promisify(exec);

/**
 * YouTube Audio Downloader with Cookie Support
 */
async function getAudioFile(url) {
    const fileName = `temp_${Date.now()}.mp3`;
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, fileName);
    
    // Netscape format cookies.txt එක ප්‍රධාන folder එකේ තිබිය යුතුයි
    const cookiePath = path.join(__dirname, '..', 'cookies.txt');

    try {
        console.log("🚀 Starting Audio Download with Cookies...");

        // Signature solving issues මගහරවා ගැනීමට අලුත් පරාමිතීන් එකතු කර ඇත
        let cmd = `yt-dlp --cookies "${cookiePath}" \
--force-ipv4 --no-check-certificates \
--extract-audio --audio-format mp3 --audio-quality 0 \
--no-warnings --ignore-errors \
"${url}" -o "${filePath}"`;

        await execPromise(cmd);

        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
            console.log("✅ Audio Download Success!");
            return { status: true, filePath: filePath };
        } else {
            throw new Error("බාගත කළ ගොනුව හිස් (Empty File).");
        }

    } catch (e) {
        console.error("YT-DLP Audio Error:", e.message);
        return { status: false, error: "සින්දුව බාගත කිරීම අසාර්ථකයි. Cookies හෝ YT-DLP update කරන්න." };
    }
}

/**
 * YouTube Video Downloader with Cookie Support
 */
async function getVideoFile(url) {
    const fileName = `temp_vid_${Date.now()}.mp4`;
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, fileName);
    const cookiePath = path.join(__dirname, '..', 'cookies.txt');

    try {
        console.log("🚀 Starting Video Download with Cookies...");

        let cmd = `yt-dlp --cookies "${cookiePath}" \
--force-ipv4 --no-check-certificates \
-f "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480]/best" \
--recode-video mp4 --no-warnings \
"${url}" -o "${filePath}"`;
            
        await execPromise(cmd);

        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
            console.log("✅ Video Download Success!");
            return { status: true, filePath: filePath };
        } else {
            throw new Error("වීඩියෝ ගොනුව හිස් (Empty File).");
        }
    } catch (e) {
        console.error("YT-DLP Video Error:", e.message);
        return { status: false, error: e.message };
    }
}

module.exports = { getAudioFile, getVideoFile };
