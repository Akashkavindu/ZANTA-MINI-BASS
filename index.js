const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    getContentType,
    fetchLatestBaileysVersion,
    Browsers,
    generateForwardMessageContent,
    prepareWAMessageMedia
} = require("@whiskeysockets/baileys");

const fs = require("fs");
const P = require("pino");
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const config = require("./config");
const { sms } = require("./lib/msg");
const { getGroupAdmins } = require("./lib/functions");
const { commands, replyHandlers } = require("./command");

const { lastMenuMessage } = require("./plugins/menu");
const { lastSettingsMessage } = require("./plugins/settings"); 
const { lastHelpMessage } = require("./plugins/help");
const { connectDB, getBotSettings, updateSetting } = require("./plugins/bot_db");

const badMacTracker = new Map();
const activeSockets = new Set();
global.BOT_SESSIONS_CONFIG = {};

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
const port = process.env.PORT || 5000;

app.get("/update-cache", async (req, res) => {
    const userNumber = req.query.id;
    if (!userNumber) return res.status(400).send("No ID");
    try {
        const newData = await getBotSettings(userNumber);
        if (newData) {
            global.BOT_SESSIONS_CONFIG[userNumber] = newData;
            console.log(`♻️ Memory Synced for ${userNumber}`);
        }
        res.send("OK");
    } catch (e) {
        res.status(500).send("Error");
    }
});

process.on('uncaughtException', (err) => {
    if (err.message.includes('Connection Closed') || err.message.includes('EPIPE')) return;
    console.error('⚠️ Exception:', err);
});
process.on('unhandledRejection', (reason) => {
    if (reason?.message?.includes('Connection Closed') || reason?.message?.includes('Unexpected end')) return;
});

async function loadPlugins() {
    const pluginsPath = path.join(__dirname, "plugins");
    fs.readdirSync(pluginsPath).forEach((plugin) => {
        if (path.extname(plugin).toLowerCase() === ".js") {
            try { require(`./plugins/${plugin}`); } catch (e) { console.error(`[Loader] Error ${plugin}:`, e); }
        }
    });
    console.log(`✨ Loaded: ${commands.length} Commands`);
}

async function startSystem() {
    await connectDB(); 
    await loadPlugins();
    const allSessions = await Session.find({});
    console.log(`📂 Total sessions: ${allSessions.length}. Connecting...`);
    const BATCH_SIZE = 4; 
    const DELAY_BETWEEN_BATCHES = 8000; 
    for (let i = 0; i < allSessions.length; i += BATCH_SIZE) {
        const batch = allSessions.slice(i, i + BATCH_SIZE);
        setTimeout(async () => {
            batch.forEach(sessionData => connectToWA(sessionData));
        }, (i / BATCH_SIZE) * DELAY_BETWEEN_BATCHES);
    }
    Session.watch().on('change', async (data) => {
        if (data.operationType === 'insert') await connectToWA(data.fullDocument);
    });
}

async function connectToWA(sessionData) {
    const userNumber = sessionData.number.split("@")[0];
    global.BOT_SESSIONS_CONFIG[userNumber] = await getBotSettings(userNumber);
    let userSettings = global.BOT_SESSIONS_CONFIG[userNumber];

    const authPath = path.join(__dirname, `/auth_info_baileys/${userNumber}/`);
    if (!fs.existsSync(authPath)) fs.mkdirSync(authPath, { recursive: true });
    try { fs.writeFileSync(path.join(authPath, "creds.json"), JSON.stringify(sessionData.creds)); } catch (e) {}

    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const { version } = await fetchLatestBaileysVersion();

    const zanta = makeWASocket({
        logger: P({ level: "silent" }), 
        printQRInTerminal: false,
        browser: Browsers.macOS("Firefox"),
        auth: state,
        version,
        syncFullHistory: false,                     
        markOnlineOnConnect: userSettings.alwaysOnline === 'true',
        shouldSyncHistoryMessage: () => false, 
        getMessage: async (key) => { return { conversation: "ZANTA-MD" } }
    });

    activeSockets.add(zanta);

    zanta.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            activeSockets.delete(zanta);
            const reason = lastDisconnect?.error?.output?.statusCode;
            const errorMsg = lastDisconnect?.error?.message || "";

            if (errorMsg.includes("Bad MAC") || errorMsg.includes("Encryption")) {
                let count = badMacTracker.get(userNumber) || 0;
                count++;
                badMacTracker.set(userNumber, count);
                if (count >= 3) {
                    await Session.deleteOne({ number: sessionData.number });
                    badMacTracker.delete(userNumber);
                } else { setTimeout(() => connectToWA(sessionData), 5000); }
            } else if (reason === DisconnectReason.loggedOut) {
                await Session.deleteOne({ number: sessionData.number });
            } else { setTimeout(() => connectToWA(sessionData), 5000); }

            if (zanta.onlineInterval) clearInterval(zanta.onlineInterval);

        } else if (connection === "open") {
            console.log(`✅ [${userNumber}] Connected Successfully`);
            badMacTracker.delete(userNumber);
            const ownerJid = decodeJid(zanta.user.id);

            if (!zanta.onlineInterval) {
                zanta.onlineInterval = setInterval(async () => {
                    const currentSet = global.BOT_SESSIONS_CONFIG[userNumber];
                    if (currentSet && currentSet.alwaysOnline === 'true') {
                        await zanta.sendPresenceUpdate('available');
                    } else {
                        await zanta.sendPresenceUpdate('unavailable');
                    }
                }, 20000); 
            }

            if (userSettings.connectionMsg === 'true') {
                await zanta.sendMessage(ownerJid, {
                    image: { url: `https://github.com/Akashkavindu/ZANTA_MD/blob/main/images/Gemini_Generated_Image_4xcl2e4xcl2e4xcl.png?raw=true` },
                    caption: `${userSettings.botName} connected ✅`,
                });
            }
        }
    });

    zanta.ev.on("creds.update", saveCreds);

    zanta.ev.on("messages.upsert", async ({ messages }) => {
        const mek = messages[0];
        if (!mek || !mek.message) return;

        userSettings = global.BOT_SESSIONS_CONFIG[userNumber];

        const type = getContentType(mek.message);
        const from = mek.key.remoteJid;
        const isGroup = from.endsWith("@g.us");
        const body = (type === "conversation") ? mek.message.conversation : (mek.message[type]?.text || mek.message[type]?.caption || "");
        const prefix = userSettings.prefix;
        const isCmd = body.startsWith(prefix);
        const isQuotedReply = mek.message[type]?.contextInfo?.quotedMessage;
        const sender = mek.key.fromMe ? zanta.user.id : (mek.key.participant || mek.key.remoteJid);

        if (from === "status@broadcast") {
            if (userSettings.autoStatusSeen === 'true') await zanta.readMessages([mek.key]);
            if (userSettings.autoStatusReact === 'true' && !mek.key.fromMe) {
                await zanta.sendMessage(from, { react: { text: "💚", key: mek.key } }, { statusJidList: [sender] });
            }
            return;
        }

        const senderNumber = decodeJid(sender).split("@")[0].replace(/[^\d]/g, '');
        const isOwner = mek.key.fromMe || senderNumber === config.OWNER_NUMBER.replace(/[^\d]/g, '');

        // --- 🛡️ 🆕 WORK TYPE (PUBLIC/PRIVATE) LOGIC ---
        // මෙමගින් Private ඇති විට අයිතිකරු නොවන අයට කමාන්ඩ් ගැසීම වළක්වයි.
        if (isCmd && userSettings.workType === 'private' && !isOwner) return;

        let groupMetadata = {};
        let participants = [];
        let groupAdmins = []; 
        let isAdmins = false;
        let isBotAdmins = false;

        if (isGroup) {
            try {
                groupMetadata = await zanta.groupMetadata(from).catch(e => ({}));
                participants = groupMetadata.participants || [];
                groupAdmins = getGroupAdmins(participants); 
                const cleanSender = decodeJid(sender);
                const cleanBot = decodeJid(zanta.user.id);
                const cleanAdmins = groupAdmins.map(v => decodeJid(v));
                isAdmins = cleanAdmins.includes(cleanSender);
                isBotAdmins = cleanAdmins.includes(cleanBot);
            } catch (e) {
                console.log("Error Fetching Group Metadata: ", e);
            }
        }

        if (userSettings.autoReply === 'true' && userSettings.autoReplies && !isCmd && !mek.key.fromMe) {
            const chatMsg = body.toLowerCase().trim();
            const foundMatch = userSettings.autoReplies.find(ar => ar.keyword.toLowerCase().trim() === chatMsg);
            if (foundMatch) {
                await zanta.sendMessage(from, { text: foundMatch.reply }, { quoted: mek });
            }
        }

        if (isGroup && !isCmd && !isQuotedReply) return;
        const m = sms(zanta, mek);
        const commandName = isCmd ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase() : "";
        const args = body.trim().split(/ +/).slice(1);

        if (userSettings.autoRead === 'true') await zanta.readMessages([mek.key]);
        if (userSettings.autoTyping === 'true') await zanta.sendPresenceUpdate('composing', from);
        if (userSettings.autoVoice === 'true' && !mek.key.fromMe) await zanta.sendPresenceUpdate('recording', from);

        const reply = (text) => zanta.sendMessage(from, { text }, { quoted: mek });

        // --- ⚙️ 🆕 MODIFIED SETTINGS REPLY HANDLER ---
        const isSettingsReply = (m.quoted && lastSettingsMessage && lastSettingsMessage.get(from) === m.quoted.id);
        if (isSettingsReply && body && !isCmd && isOwner) {
            const input = body.trim().split(" ");
            let index = parseInt(input[0]);
            
            // Index පේළිය: 1.Name, 2.Owner, 3.Prefix, 4.WorkType, 5.Pass, 6.AlwaysOnline...
            let dbKeys = ["", "botName", "ownerName", "prefix", "workType", "password", "alwaysOnline", "autoRead", "autoTyping", "autoStatusSeen", "autoStatusReact", "readCmd", "autoVoice", "autoReply", "connectionMsg"];
            let dbKey = dbKeys[index];

            if (dbKey) {
                // විශේෂ අවස්ථාව: Auto Reply Settings (Index 13)
                if (index === 13 && input.length === 1) {
                    let siteMsg = `📝 *ZANTA-MD AUTO REPLY SETTINGS*\n\nඔබේ බොට් සඳහා Auto Reply මැසේජ් සෑදීමට පහත Link එකට පිවිසෙන්න.\n\n🔗 *Link:* https://chic-puppy-62f8d1.netlify.app/\n\n*Status:* ${userSettings.autoReply === 'true' ? '✅ ON' : '❌ OFF'}`;
                    return reply(siteMsg);
                }

                // අගය ලබා ගැනීම (Boolean values logic starting from index 6)
                let finalValue = "";
                if (index === 4) {
                    // Work Type: 4 public හෝ 4 private
                    finalValue = input[1] === 'private' ? 'private' : 'public';
                } else if (index >= 6) {
                    // ON/OFF values
                    finalValue = input[1] === 'on' ? 'true' : 'false';
                } else {
                    // Text values (Name, Owner, Prefix, Pass)
                    finalValue = input.slice(1).join(" ");
                }

                if (!finalValue && index !== 13) return reply("⚠️ කරුණාකර අගයක් ලබා දෙන්න. (E.g: 4 private)");

                await updateSetting(userNumber, dbKey, finalValue);
                if (userSettings) userSettings[dbKey] = finalValue;
                global.BOT_SESSIONS_CONFIG[userNumber] = userSettings;

                if (dbKey === "alwaysOnline") {
                    await zanta.sendPresenceUpdate(finalValue === 'true' ? 'available' : 'unavailable', from);
                }

                await reply(`✅ *${dbKey}* updated to: *${finalValue.toUpperCase()}*`);
                return;
            }
        }

        const isMenuReply = (m.quoted && lastMenuMessage && lastMenuMessage.get(from) === m.quoted.id);
        const isHelpReply = (m.quoted && lastHelpMessage && lastHelpMessage.get(from) === m.quoted.id);

        // --- 🎬 MOVIE REPLY HANDLER ---
        const { pendingSearch, pendingQuality } = require("./plugins/movie");
        const isMovieReply = (body && !isNaN(body.trim())) && ((pendingSearch && pendingSearch[sender]) || (pendingQuality && pendingQuality[sender]));

        if (isMovieReply && !isCmd) {
            const movieCmd = commands.find(c => c.pattern === 'movie' || (c.alias && c.alias.includes('movie')));
            if (movieCmd) {
                try {
                    await movieCmd.function(zanta, mek, m, {
                        from, body, isCmd: false, command: 'movie', args: [body.trim()], q: body.trim(),
                        isGroup, sender, senderNumber, isOwner, reply, prefix, userSettings,
                        groupMetadata, participants, groupAdmins, isAdmins, isBotAdmins 
                    });
                    return;
                } catch (e) { console.error("Movie Reply Error:", e); }
            }
        }

        if (isCmd || isMenuReply || isHelpReply) {
            const execName = isHelpReply ? 'help' : (isMenuReply ? 'menu' : commandName);
            const execArgs = (isHelpReply || isMenuReply) ? [body.trim().toLowerCase()] : args;
            const cmd = commands.find(c => c.pattern === execName || (c.alias && c.alias.includes(execName)));
            if (cmd) {
                if (userSettings.readCmd === 'true') await zanta.readMessages([mek.key]);
                if (cmd.react) zanta.sendMessage(from, { react: { text: cmd.react, key: mek.key } });
                try {
                    await cmd.function(zanta, mek, m, {
                        from, body, isCmd, command: execName, args: execArgs, q: execArgs.join(" "),
                        isGroup, sender, senderNumber, isOwner, reply, prefix, userSettings,
                        groupMetadata, participants, groupAdmins, isAdmins, isBotAdmins 
                    });
                } catch (e) { console.error(e); }
            }
        }
    });
}

startSystem();
app.get("/", (req, res) => res.send("ZANTA-MD Online ✅"));
app.listen(port);

setTimeout(async () => {
    console.log("♻️ [RESTART] Cleaning up active connections...");
    for (const socket of activeSockets) {
        try { await socket.end(); } catch (e) {}
    }
    setTimeout(() => {
        console.log("🚀 Exiting for scheduled restart.");
        process.exit(0);
    }, 5000);
}, 60 * 60 * 1000);
