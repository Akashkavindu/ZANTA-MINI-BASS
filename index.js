const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    getContentType,
    fetchLatestBaileysVersion,
    Browsers,
} = require("@whiskeysockets/baileys");

const fs = require("fs");
const P = require("pino");
const express = require("express");
const path = require("path");
const mongoose = require("mongoose"); // [වෙනස 1]: MongoDB සඳහා mongoose එකතු කළා
const config = require("./config");
const { sms } = require("./lib/msg");
const { getGroupAdmins } = require("./lib/functions");
const { commands, replyHandlers } = require("./command");

const { lastMenuMessage } = require("./plugins/menu");
const { lastSettingsMessage } = require("./plugins/settings"); 
const { lastHelpMessage } = require("./plugins/help"); 
const { connectDB, getBotSettings, updateSetting } = require("./plugins/bot_db");

// [වෙනස 2]: MongoDB Session Schema එක (අලුත් DB එකේ creds කියවන්න)
const SessionSchema = new mongoose.Schema({
    number: { type: String, required: true, unique: true },
    creds: { type: Object, required: true }
}, { collection: 'sessions' });
const Session = mongoose.models.Session || mongoose.model("Session", SessionSchema);

const decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
        const decode = jid.split(':');
        return (decode[0] + '@' + decode[1].split('@')[1]) || jid;
    }
    return jid;
};

global.CURRENT_BOT_SETTINGS = {
    botName: config.DEFAULT_BOT_NAME,
    ownerName: config.DEFAULT_OWNER_NAME,
    prefix: config.DEFAULT_PREFIX,
};

const app = express();
const port = process.env.PORT || 8000;
const messagesStore = {};

const customBadWords = ["fuck", "sex", "porn", "හුකන", "පොන්න", "පුක", "බැල්ලි", "කුණුහරුප"];

process.on('uncaughtException', (err) => console.error('⚠️ Exception:', err));
process.on('unhandledRejection', (reason) => console.error('⚠️ Rejection:', reason));

// [වෙනස 3]: මුලින්ම පද්ධතිය පණගන්වන Function එක (MEGA වෙනුවට MongoDB පාවිච්චි කරයි)
async function startSystem() {
    await connectDB(); // Bot Settings DB එක
    global.CURRENT_BOT_SETTINGS = await getBotSettings();

    // ඩේටාබේස් එකේ ඉන්න හැම සෙෂන් එකක්ම ගන්නවා
    const allSessions = await Session.find({});
    console.log(`🚀 Found ${allSessions.length} sessions. Initializing...`);

    if (allSessions.length === 0) {
        console.error("❌ No sessions found in MongoDB 'sessions' collection.");
        return;
    }

    // හැම සෙෂන් එකකටම වෙන වෙනම කනෙක්ට් වෙනවා
    for (let sessionData of allSessions) {
        await connectToWA(sessionData);
    }
}

async function connectToWA(sessionData) {
    const userNumber = sessionData.number;
    // [වෙනස 4]: එක් එක් නම්බර් එකට වෙනම auth folder එකක් සාදයි
    const authPath = path.join(__dirname, `/auth_info_baileys/${userNumber}/`);
    
    if (!fs.existsSync(authPath)) fs.mkdirSync(authPath, { recursive: true });
    fs.writeFileSync(path.join(authPath, "creds.json"), JSON.stringify(sessionData.creds));

    const pluginsPath = path.join(__dirname, "plugins");
    fs.readdirSync(pluginsPath).forEach((plugin) => {
        if (path.extname(plugin).toLowerCase() === ".js") {
            try {
                require(`./plugins/${plugin}`);
            } catch (e) {
                console.error(`[Loader] Error ${plugin}:`, e);
            }
        }
    });

    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const { version } = await fetchLatestBaileysVersion();

    const zanta = makeWASocket({
        logger: P({ level: "silent" }),
        printQRInTerminal: false,
        browser: Browsers.macOS("Firefox"),
        auth: state,
        version,
        syncFullHistory: true,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: true,
    });

    zanta.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) connectToWA(sessionData);
        } else if (connection === "open") {
            console.log(`✅ [${userNumber}] ZANTA-MD Connected`);

            setInterval(async () => {
                if (global.CURRENT_BOT_SETTINGS.alwaysOnline === 'true') {
                    await zanta.sendPresenceUpdate('available');
                } else {
                    await zanta.sendPresenceUpdate('unavailable');
                }
            }, 10000);

            const ownerJid = decodeJid(zanta.user.id);
            await zanta.sendMessage(ownerJid, {
                image: { url: `https://github.com/Akashkavindu/ZANTA_MD/blob/main/images/alive-new.jpg?raw=true` },
                caption: `${global.CURRENT_BOT_SETTINGS.botName} connected ✅\n\nUSER: ${userNumber}\nPREFIX: ${global.CURRENT_BOT_SETTINGS.prefix}`,
            });
        }
    });

    // [වෙනස 5]: Creds update උනොත් MongoDB එකටත් update කරනවා (බොට් disconnect වීම වැලකීමට)
    zanta.ev.on("creds.update", async () => {
        await saveCreds();
        const updatedCreds = JSON.parse(fs.readFileSync(path.join(authPath, "creds.json"), "utf-8"));
        await Session.findOneAndUpdate({ number: userNumber }, { creds: updatedCreds });
    });

    zanta.ev.on("messages.upsert", async ({ messages }) => {
        const mek = messages[0];
        if (!mek || !mek.message) return;

        if (global.CURRENT_BOT_SETTINGS.autoStatusSeen === 'true' && mek.key.remoteJid === "status@broadcast") {
            await zanta.readMessages([mek.key]);
            return;
        }

        if (mek.key.id && !mek.key.fromMe) messagesStore[mek.key.id] = mek;

        mek.message = getContentType(mek.message) === "ephemeralMessage" 
            ? mek.message.ephemeralMessage.message : mek.message;

        const m = sms(zanta, mek);
        const type = getContentType(mek.message);
        const from = mek.key.remoteJid;
        const body = type === "conversation" ? mek.message.conversation : mek.message[type]?.text || mek.message[type]?.caption || "";

        const prefix = global.CURRENT_BOT_SETTINGS.prefix;
        const isCmd = body.startsWith(prefix);
        const commandName = isCmd ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase() : "";
        const args = body.trim().split(/ +/).slice(1);

        const sender = mek.key.fromMe ? zanta.user.id : (mek.key.participant || mek.key.remoteJid);
        const decodedSender = decodeJid(sender);
        const decodedBot = decodeJid(zanta.user.id);
        const senderNumber = decodedSender.split("@")[0].replace(/[^\d]/g, '');
        const configOwner = config.OWNER_NUMBER.replace(/[^\d]/g, '');

        const isOwner = mek.key.fromMe || 
                        sender === zanta.user.id || 
                        decodedSender === decodedBot || 
                        senderNumber === configOwner;

        if (global.CURRENT_BOT_SETTINGS.autoRead === 'true') await zanta.readMessages([mek.key]);
        if (global.CURRENT_BOT_SETTINGS.autoTyping === 'true') await zanta.sendPresenceUpdate('composing', from);
        if (global.CURRENT_BOT_SETTINGS.autoVoice === 'true' && !mek.key.fromMe) await zanta.sendPresenceUpdate('recording', from);

        const botNumber2 = await jidNormalizedUser(zanta.user.id);
        const isGroup = from.endsWith("@g.us");
        const groupMetadata = isGroup ? await zanta.groupMetadata(from).catch(() => ({})) : {};
        const participants = isGroup ? groupMetadata.participants : [];
        const groupAdmins = isGroup ? participants.filter(p => p.admin !== null).map(p => p.id) : [];
        const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false;
        const isAdmins = isGroup ? groupAdmins.includes(sender) : false;

        // --- Anti Badwords (ඔයාගේ මුල් Logic එකමයි) ---
        if (isGroup && global.CURRENT_BOT_SETTINGS.antiBadword === 'true' && !isAdmins && !isOwner) {
            const badWords = ["fuck", "sex", "porn", "හුකන", "පොන්න", "පුක", "බැල්ලි", "කුණුහරුප", "huththa", "pakaya" , "kariya", "hukanna", "pkya", "wezi", "hutta", "hutt", "pky", "ponnaya", "ponnya", "balla", "love"]; 
            const hasBadWord = badWords.some(word => body.toLowerCase().includes(word));

            if (hasBadWord) {
                await zanta.sendMessage(from, { delete: mek.key });
                await zanta.sendMessage(from, { 
                    text: `⚠️ *@${sender.split('@')[0]} ඔබේ පණිවිඩය ඉවත් කරන ලදී!*`,
                    mentions: [sender]
                });
                return;
            }
        }
        
        const reply = (text) => zanta.sendMessage(from, { text }, { quoted: mek });
        const isMenuReply = (m.quoted && lastMenuMessage && lastMenuMessage.get(from) === m.quoted.id);
        const isSettingsReply = (m.quoted && lastSettingsMessage && lastSettingsMessage.get(from) === m.quoted.id);
        const isHelpReply = (m.quoted && lastHelpMessage && lastHelpMessage.get(from) === m.quoted.id);

        if (isSettingsReply && body && !isCmd && isOwner) {
            const input = body.trim().split(" ");
            const num = input[0];
            const value = input.slice(1).join(" ");
            let dbKeys = ["", "botName", "ownerName", "prefix", "autoRead", "autoTyping", "autoStatusSeen", "alwaysOnline", "readCmd", "autoVoice" , "antiBadword"];
            let dbKey = dbKeys[parseInt(num)];

            if (dbKey) {
                let finalValue = (['4', '5', '6', '7', '8', '9', '10'].includes(num)) 
                    ? ((value.toLowerCase() === 'on' || value.toLowerCase() === 'true') ? 'true' : 'false') : value;
                const success = await updateSetting(dbKey, finalValue);
                if (success) {
                    global.CURRENT_BOT_SETTINGS[dbKey] = finalValue;
                    await reply(`✅ *${dbKey}* updated to: *${finalValue}*`);
                    const cmd = commands.find(c => c.pattern === 'settings');
                    if (cmd) cmd.function(zanta, mek, m, { from, reply, isOwner, prefix });
                    return;
                }
            }
        }

        if (isCmd || isMenuReply || isHelpReply) {
            const execName = isHelpReply ? 'help' : (isMenuReply ? 'menu' : commandName);
            const execArgs = (isHelpReply || isMenuReply) ? [body.trim().toLowerCase()] : args;
            const cmd = commands.find(c => c.pattern === execName || (c.alias && c.alias.includes(execName)));

            if (cmd) {
                if (global.CURRENT_BOT_SETTINGS.readCmd === 'true') await zanta.readMessages([mek.key]);
                if (cmd.react) zanta.sendMessage(from, { react: { text: cmd.react, key: mek.key } });
                try {
                    cmd.function(zanta, mek, m, {
                        from, quoted: mek, body, isCmd, command: execName, args: execArgs, q: execArgs.join(" "),
                        isGroup, sender, senderNumber, botNumber2, botNumber: senderNumber, pushname: mek.pushName || "User",
                        isMe: mek.key.fromMe, isOwner, groupMetadata, groupName: groupMetadata.subject, participants,
                        groupAdmins, isBotAdmins, isAdmins, reply, prefix
                    });
                } catch (e) {
                    console.error("[ERROR]", e);
                }
            }
        }
    });
}

// පද්ධතිය ආරම්භ කරයි
startSystem();

app.get("/", (req, res) => res.send(`Hey, Multi-Bot System Online ✅`));
app.listen(port, () => console.log(`Server on port ${port}`));
