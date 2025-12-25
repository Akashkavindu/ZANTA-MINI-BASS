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
const mongoose = require("mongoose");
const config = require("./config");
const { sms } = require("./lib/msg");
const { getGroupAdmins } = require("./lib/functions");
const { commands, replyHandlers } = require("./command");

const { lastMenuMessage } = require("./plugins/menu");
const { lastSettingsMessage } = require("./plugins/settings"); 
const { lastHelpMessage } = require("./plugins/help"); 
const { connectDB, getBotSettings, updateSetting } = require("./plugins/bot_db");

// MongoDB Session Schema
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

// අනවශ්‍ය Rejection Logs පාලනය
process.on('uncaughtException', (err) => {
    if (err.message.includes('Connection Closed')) return;
    console.error('⚠️ Exception:', err);
});
process.on('unhandledRejection', (reason) => {
    if (reason?.message?.includes('Connection Closed')) return;
    console.error('⚠️ Rejection:', reason);
});

async function loadPlugins() {
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
    console.log(`✨ Loaded: ${commands.length} Commands`);
}

async function startSystem() {
    await connectDB(); 
    await loadPlugins();

    const allSessions = await Session.find({});
    for (let sessionData of allSessions) {
        await connectToWA(sessionData);
    }

    Session.watch().on('change', async (data) => {
        if (data.operationType === 'insert') {
            const newSession = data.fullDocument;
            console.log(`🆕 New session detected for: ${newSession.number}. Connecting...`);
            await connectToWA(newSession);
        }
    });
}

async function connectToWA(sessionData) {
    const userNumber = sessionData.number.split("@")[0];
    let userSettings = await getBotSettings(userNumber);

    const authPath = path.join(__dirname, `/auth_info_baileys/${userNumber}/`);
    if (!fs.existsSync(authPath)) fs.mkdirSync(authPath, { recursive: true });
    fs.writeFileSync(path.join(authPath, "creds.json"), JSON.stringify(sessionData.creds));

    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const { version } = await fetchLatestBaileysVersion();

    const zanta = makeWASocket({
        logger: P({ level: "silent" }),
        printQRInTerminal: false,
        browser: Browsers.macOS("Firefox"),
        auth: state,
        version,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: true,
    });

    zanta.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode;

            if (reason === DisconnectReason.loggedOut || reason === 401) {
                console.log(`🚫 [${userNumber}] Logged out. Cleaning up...`);
                await Session.deleteOne({ number: sessionData.number });
                if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
                return; // Logout වූ පසු Reconnect වීම නවත්වයි
            } else {
                connectToWA(sessionData);
            }
        } else if (connection === "open") {
            console.log(`✅ [${userNumber}] ZANTA-MD Connected`);

            setInterval(async () => {
                try {
                    const presence = userSettings.alwaysOnline === 'true' ? 'available' : 'unavailable';
                    await zanta.sendPresenceUpdate(presence);
                } catch (e) {} // Connection වැසුණු පසු එන Presence errors නොපෙන්වයි
            }, 10000);

            const ownerJid = decodeJid(zanta.user.id);
            await zanta.sendMessage(ownerJid, {
                image: { url: `https://github.com/Akashkavindu/ZANTA_MD/blob/main/images/alive-new.jpg?raw=true` },
                caption: `${userSettings.botName} connected ✅\n\nUSER: ${userNumber}\nPREFIX: ${userSettings.prefix}\nTOTAL COMMANDS: ${commands.length}`,
            });
        }
    });

    zanta.ev.on("creds.update", async () => {
        await saveCreds();
        const credsFile = path.join(authPath, "creds.json");
        if (fs.existsSync(credsFile)) {
            const updatedCreds = JSON.parse(fs.readFileSync(credsFile, "utf-8"));
            await Session.findOneAndUpdate({ number: sessionData.number }, { creds: updatedCreds });
        }
    });

    zanta.ev.on("messages.upsert", async ({ messages }) => {
        const mek = messages[0];
        if (!mek || !mek.message) return;

        if (userSettings.autoStatusSeen === 'true' && mek.key.remoteJid === "status@broadcast") {
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

        const prefix = userSettings.prefix;
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

        if (userSettings.autoRead === 'true') await zanta.readMessages([mek.key]);
        if (userSettings.autoTyping === 'true') await zanta.sendPresenceUpdate('composing', from);
        if (userSettings.autoVoice === 'true' && !mek.key.fromMe) await zanta.sendPresenceUpdate('recording', from);

        const botNumber2 = await jidNormalizedUser(zanta.user.id);
        const isGroup = from.endsWith("@g.us");
        const groupMetadata = isGroup ? await zanta.groupMetadata(from).catch(() => ({})) : {};
        const participants = isGroup ? groupMetadata.participants : [];
        const groupAdmins = isGroup ? participants.filter(p => p.admin !== null).map(p => p.id) : [];
        const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false;
        const isAdmins = isGroup ? groupAdmins.includes(sender) : false;

        if (isGroup && userSettings.antiBadword === 'true' && !isAdmins && !isOwner) {
            const badWords = ["fuck", "sex", "porn", "හුකන", "පොන්න", "පුක", "බැල්ලි", "කුණුහරුප", "huththa", "pakaya", "huththo", "ponnayo", "hukanno", "kariyo" , "kariya", "hukanna", "pkya", "wezi", "hutta", "hutt", "pky", "ponnaya", "ponnya", "balla", "love"]; 
            const hasBadWord = badWords.some(word => body.toLowerCase().includes(word));
            if (hasBadWord) {
                await zanta.sendMessage(from, { delete: mek.key });
                await zanta.sendMessage(from, { text: `⚠️ *@${sender.split('@')[0]} ඔබේ පණිවිඩය ඉවත් කරන ලදී!*`, mentions: [sender] });
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

                const success = await updateSetting(userNumber, dbKey, finalValue);
                if (success) {
                    userSettings[dbKey] = finalValue;
                    await reply(`✅ *${dbKey}* updated to: *${finalValue}*`);
                    const cmdSettings = commands.find(c => c.pattern === 'settings');
                    if (cmdSettings) cmdSettings.function(zanta, mek, m, { from, reply, isOwner, prefix, userSettings }); 
                    return;
                }
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
                        from, quoted: mek, body, isCmd, command: execName, args: execArgs, q: execArgs.join(" "),
                        isGroup, sender, senderNumber, botNumber2, botNumber: senderNumber, pushname: mek.pushName || "User",
                        isMe: mek.key.fromMe, isOwner, groupMetadata, groupName: groupMetadata.subject, participants,
                        groupAdmins, isBotAdmins, isAdmins, reply, prefix, userSettings 
                    });
                } catch (e) {
                    console.error("[ERROR]", e);
                }
            }
        }
    });
}

startSystem();

app.get("/", (req, res) => res.send("Multi-Bot System Online ✅"));
app.listen(port, '0.0.0.0', () => console.log(`Server on port ${port}`));
