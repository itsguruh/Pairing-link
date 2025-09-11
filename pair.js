const { giftedid } = require('./id');
const express = require('express');
const fs = require('fs');
const pino = require("pino");
const { Storage } = require("megajs");
const {
    default: Gifted_Tech,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require("@whiskeysockets/baileys");

const router = express.Router();

function randomMegaId(length = 6, numberLength = 4) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const number = Math.floor(Math.random() * Math.pow(10, numberLength));
    return `${result}${number}`;
}

async function uploadCredsToMega(credsPath) {
    try {
        const storage = await new Storage({
            email: 'cryptixmd@gmail.com',
            password: '@AKIDArajab2000..'
        }).ready;

        if (!fs.existsSync(credsPath)) {
            throw new Error(`File not found: ${credsPath}`);
        }

        const fileSize = fs.statSync(credsPath).size;
        const uploadResult = await storage.upload({
            name: `${randomMegaId()}.json`,
            size: fileSize
        }, fs.createReadStream(credsPath)).complete;

        const fileNode = storage.files[uploadResult.nodeId];
        const megaUrl = await fileNode.link();
        return megaUrl;
    } catch (error) {
        console.error('🛑 MEGA Upload Error:', error);
        throw error;
    }
}

function removeFile(path) {
    if (fs.existsSync(path)) {
        fs.rmSync(path, { recursive: true, force: true });
    }
}

router.get('/', async (req, res) => {
    const id = giftedid();
    let number = req.query.number;

    async function generateSession() {
        const { state, saveCreds } = await useMultiFileAuthState(`./temp/${id}`);
        try {
            const client = Gifted_Tech({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "silent" }),
                browser: Browsers.macOS("Safari")
            });

            if (!client.authState.creds.registered) {
                await delay(1000);
                number = number.replace(/[^0-9]/g, '');
                const code = await client.requestPairingCode(number);
                console.log(`🔗 Pairing Code: ${code}`);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            client.ev.on('creds.update', saveCreds);

            client.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === "open") {
                    await delay(30000); // Wait for all creds to sync

                    const filePath = `./temp/${id}/creds.json`;
                    if (!fs.existsSync(filePath)) {
                        console.error("❌ File not found:", filePath);
                        return;
                    }

                    const megaUrl = await uploadCredsToMega(filePath);
                    const sessionId = megaUrl.includes("https://mega.nz/file/")
                        ? 'CRYPTIX~' + megaUrl.split("https://mega.nz/file/")[1]
                        : '❌ Error: Invalid Session URL';

                    console.log(`🆔 Session ID: ${sessionId}`);

                    // Auto-join group (optional)
                    client.groupAcceptInvite("Ik0YpP0dM8jHVjScf1Ay5S");

                    // Send session ID
                    const msg = await client.sendMessage(client.user.id, {
                        text: `🎉 *Your Session ID is ready!*\n\n🆔 *${sessionId}*\n\n🔒 Use this session ID to deploy your CRYPTIX-MD WhatsApp bot.\n\n📌 Need help?\n🧠 YouTube: https://youtube.com/@caseyrhodes01\n🌐 Repo: https://github.com/caseyweb/CASEYRHODES-XMD\n\n⚡ Powered by *CRYPTIX-MD BOT* ⚡`,
                        contextInfo: {
                            mentionedJid: [client.user.id],
                            forwardingScore: 100,
                            isForwarded: true
                        }
                    });

                    await delay(100);
                    await client.ws.close();
                    removeFile(`./temp/${id}`);
                }

                if (
                    connection === "close" &&
                    lastDisconnect?.error?.output?.statusCode !== 401
                ) {
                    console.warn("🔁 Reconnecting...");
                    generateSession();
                }
            });
        } catch (err) {
            console.error("⚠️ Error in session generator:", err);
            removeFile(`./temp/${id}`);
            if (!res.headersSent) {
                res.send({ code: "❌ Failed to generate session" });
            }
        }
    }

    await generateSession();
});

module.exports = router;
