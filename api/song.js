const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const execPromise = promisify(exec);

/**
 * YouTube වීඩියෝව සර්වර් එකට Download කර මාර්ගය (Path) ලබා දෙයි.
 */
async function getAudioFile(url) {
    try {
        // සින්දුවේ නම සහ තාවකාලික ෆයිල් නම සැකසීම
        const fileName = `temp_${Date.now()}.mp3`;
        const filePath = path.join(__dirname, '..', 'temp', fileName); 

        // yt-dlp හරහා MP3 එකක් විදිහට Download කිරීම
        // -x: audio extract, --audio-format mp3: convert to mp3

        const cmd = `python3 -m yt_dlp "${url}" -x --audio-format mp3 -o "${filePath}"`;

        await execPromise(cmd);
        return {
            status: true,
            filePath: filePath
        };
    } catch (e) {
        console.error("YT-DLP API Error:", e);
        return { status: false, error: "Download failed" };
    }
}

/**
 * වීඩියෝව (MP4) Download කිරීම සඳහා
 */
async function getVideoFile(url) {
    try {
        const fileName = `temp_vid_${Date.now()}.mp4`;
        const filePath = path.join(__dirname, '..', 'temp', fileName);

        // --recode-video mp4 : වීඩියෝව mp4 වලට හරවයි (Black screen ප්‍රශ්නය වළක්වයි)
        // -S res:480,vcodec:h264 : WhatsApp වලට ගැලපෙන resolution සහ codec එක තෝරයි
        const cmd = `python3 -m yt_dlp "${url}" -f "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480]/best" --recode-video mp4 -o "${filePath}"`;

        await execPromise(cmd);

        return {
            status: true,
            filePath: filePath
        };
    } catch (e) {
        console.error("Video Download Error:", e);
        return { status: false, error: "Video download failed" };
    }
}

module.exports = { getAudioFile, getVideoFile };
