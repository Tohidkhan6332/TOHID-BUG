# 🤖 TOHID-AI

> A multi-session WhatsApp bot project by **MR TOHID** with pairing support, media utilities, command handling, and an accompanying Telegram bot component.

## ✨ Overview

TOHID-AI is a Node.js-based automation bot built around the WhatsApp multi-device ecosystem. The project contains:

- 📱 WhatsApp multi-session / pairing support
- 🔗 Pairing-code based connection flow
- 🧩 Large command and utility collection
- 🎵 Media, downloader and conversion utilities
- 🖼️ Sticker and image assets
- 📦 Local JSON-based data storage
- 🤖 Telegram bot component
- ⚙️ PM2 ecosystem configuration
- 🛠️ Runtime/debug utilities
- 📁 Separate configuration, database and media directories

## 📂 Project Structure

```text
TOHID-BUG/
├── allfunc/              # Shared bot utilities and helpers
├── database/             # JSON database files
├── media/                # Bot media assets
├── nexstore/             # Pairing, bot data and helper modules
├── setting/              # Bot configuration
├── src/media/            # Media data
├── sticker/              # Sticker assets
├── utils/                # Runtime utility files
├── autoload.js           # Session/autoload logic
├── bot.js                # Telegram bot component
├── case.js               # WhatsApp command handlers
├── debug.js              # Debug utilities
├── index.js              # Main entry point
├── pair.js               # Pairing/session logic
├── runtimeUsage.js       # Runtime information
├── ecosystem.config.js   # PM2 configuration
├── package.json          # Node.js dependencies/scripts
└── package-lock.json     # Dependency lockfile
├── .env.example          # Environment variable template
```

## 🚀 Installation

### Requirements

- Node.js 18+
- npm
- FFmpeg for media-related features
- A WhatsApp account for pairing
- A Telegram bot token if the Telegram component is enabled

### Setup

```bash
git clone https://github.com/Tohidkhan6332/TOHID-BUG.git
cd TOHID-BUG
npm install
npm start
```

For PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
```

## ⚙️ Configuration

Before running the bot in production:

1. Review `setting/config.js`.
2. Review the pairing/session configuration.
3. Move API keys, bot tokens and passwords to environment variables.
4. Do **not** commit WhatsApp authentication/session data.
5. Do **not** publish Telegram bot tokens or other private credentials.

A recommended production setup is:

```text
.env
├── TELEGRAM_BOT_TOKEN
├── STARTUP_PASSWORD
├── API_KEY_*
└── other private configuration
```

Add `.env` to `.gitignore`.

## 🧪 Project Status

The repository currently contains the project files from the supplied TOHID-AI ZIP. A structural comparison shows the main source tree and media files are present in the repository.

However, the source should be treated as **under active repair/testing**, not as a guaranteed production-ready build.

Known items that should be fixed before deployment include:

- The original `case.js` syntax error has been repaired.
- The missing `utils/process-guard` module has been added.
- The obsolete `./serialize` dependency in `nexstore/oke.js` has been removed from the runtime path.
- Dependencies are installed with `npm install`; the lockfile is intentionally regenerated for the legacy Baileys line.
- Authentication/session and credential files need production-safe handling.
- The project has multiple JSON/database storage locations that should be reviewed for consistency.
- Baileys is pinned to legacy `6.7.24` and the project supports Node.js 18+.
- Obfuscation/deobfuscation packages that were absent from the lockfile are treated as optional features rather than installation blockers.

## 🔐 Security

Never publish:

- WhatsApp authentication/session credentials
- Telegram bot tokens
- API keys
- Startup passwords
- Private pairing information
- Personal access tokens

If a credential was previously committed to a public repository, revoke/rotate it because changing the current file does not erase old Git history. The current runtime reads secrets from environment variables.

## 🛠️ Useful Commands

```bash
# Install dependencies
npm install

# Start WhatsApp bot
npm start

# Start Telegram component
npm run bot

# Development mode
npm run dev

# Syntax check for the main entry point
npm test
```

## 📜 License

This project is distributed under the license declared in `package.json`.

## 👤 Developer

**MR TOHID**

GitHub: [@Tohidkhan6332](https://github.com/Tohidkhan6332)

Telegram: [TOHID-AI](https://t.me/TohidAi_bot)

---

### ⚠️ Disclaimer

Use this project responsibly and only with accounts, groups, services and content that you are authorized to automate. The repository author and contributors are not responsible for misuse or third-party platform restrictions.
