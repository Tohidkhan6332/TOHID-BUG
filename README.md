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
├── tohidstore/          # Pairing, bot data and helper modules
├── setting/              # Bot configuration
├── src/media/            # Media data
├── sticker/              # Sticker assets
├── utils/                # Runtime utility files
├── autoload.js           # Session/autoload logic
├── Tohid.js             # Telegram bot component
├── MrTohid.js           # WhatsApp command handlers
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

- Node.js 20+
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

The repository contains the current TOHID-AI source tree. A structural comparison shows the main source tree and media files are present in the repository.

However, the source should be treated as **under active repair/testing**, not as a guaranteed production-ready build.

Known items that should be fixed before deployment include:

- The original command-handler syntax issue has been repaired.
- The missing `utils/process-guard` module has been added.
- The obsolete `./serialize` dependency in `tohidstore/oke.js` has been removed from the runtime path.
- Dependencies are installed with `npm install`; the repository currently uses `npm install` because the Baileys dependency is a GitHub source and the lockfile is intentionally not committed.
- Authentication/session and credential files need production-safe handling.
- The project has multiple JSON/database storage locations that should be reviewed for consistency.
- Baileys uses the PouCode GitHub fork (`github:pou-code/Baileys`) through the CommonJS compatibility bridge; Node.js 20+ is required.
- Obfuscation/deobfuscation packages that were absent from the lockfile are treated as optional features rather than installation blockers.

## 📱 Termux Deployment

> Recommended: Node.js 20+ and a Termux installation with access to the official package repositories.

### 1. Install Termux packages

```bash
pkg update -y && pkg upgrade -y
pkg install git nodejs-lts ffmpeg -y
```

Check versions:

```bash
node -v
npm -v
```

Node.js must satisfy the project's `>=20.0.0` requirement.

### 2. Clone and install

```bash
git clone https://github.com/Tohidkhan6332/TOHID-BUG.git
cd TOHID-BUG
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
nano .env
```

Set at least:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
STARTUP_PASSWORD=your_secure_startup_password
```

Then start:

```bash
npm start
```

### 4. Keep the bot running with PM2

```bash
npm install -g pm2
pm2 start index.js --name TOHID-AI
pm2 save
pm2 status
```

Useful commands:

```bash
pm2 logs TOHID-AI
pm2 restart TOHID-AI
pm2 stop TOHID-AI
```

Do not commit `.env` or WhatsApp session/authentication files.

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

Telegram: [@Tohidkhan6332](https://t.me/Tohidkhan6332)

---

### ⚠️ Disclaimer

Use this project responsibly and only with accounts, groups, services and content that you are authorized to automate. The repository author and contributors are not responsible for misuse or third-party platform restrictions.
