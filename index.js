// index.js
const express = require("express");
const path = require("path");
const pino = require("pino");

const app = express();
const logger = pino({ level: "info" });

// Use dynamic port (Heroku/Render sets process.env.PORT)
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (css, js, music, images)
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "main.html"));
});

app.get("/pair", (req, res) => {
  res.sendFile(path.join(__dirname, "pair.html"));
});

// Example API endpoint for generating pairing code
app.post("/api/pair", (req, res) => {
  const { number } = req.body;

  if (!number) {
    return res.status(400).json({ success: false, message: "Number required" });
  }

  // 🔥 Dummy generator (replace with real Baileys/MD session logic)
  const pairingCode = `CRYPTIX-${Math.floor(Math.random() * 1000000)}`;

  logger.info(`Generated session for ${number}: ${pairingCode}`);
  res.json({ success: true, code: pairingCode });
});

// Start server
app.listen(PORT, () => {
  console.clear();
  console.log(`
╔════════════════════════════════════════╗
║     ⚡ CRYPTIX-MD SESSION GENERATOR ⚡    ║
╠════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}  
║  Author: itsguruh                      
║  Bot: CRYPTIX-MD 🤖                    
╚════════════════════════════════════════╝
  `);
});
