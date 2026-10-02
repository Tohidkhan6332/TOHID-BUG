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

## 🚀 Deploy to Heroku

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://www.heroku.com/deploy?template=https://github.com/Tohidkhan6332/TOHID-BUG)

Click the button above to create a Heroku app directly from this repository.

### Heroku setup

1. Click **Deploy to Heroku** above.
2. Enter a secure `STARTUP_PASSWORD` when Heroku asks for configuration.
3. Add `TELEGRAM_BOT_TOKEN` only if you use the Telegram component.
4. Create the app and let Heroku build the worker dyno.
5. Check Heroku logs and complete the bot's pairing/configuration flow.

> **Important:** WhatsApp session data should be handled carefully on Heroku. Heroku dyno filesystems are not a substitute for persistent storage, so production deployments should use an appropriate external/persistent session strategy.

### `.update` on Heroku

For Heroku, `.update` should use a deployment hook rather than relying on a local `git pull`. Set `TOHID_UPDATE_HOOK_URL` to a secure deployment endpoint that rebuilds the app from the `main` branch. The bot will call that hook and then exit so Heroku can start the new release.

Do **not** put a Heroku API token directly in the source code or README. Heroku's Platform API supports authenticated build creation, and Heroku Button provides the one-click deployment flow.

For automatic GitHub-to-Heroku deployments, connect the Heroku app to this GitHub repository from the Heroku Dashboard's **Deploy** tab.
## 🚀 Deployment

TOHID-AI is prepared for multiple deployment styles. The recommended path is a persistent Node.js/Docker worker because WhatsApp requires a long-running process.

### ☁️ One-click / direct deployment

| Platform | Deploy | Notes |
|---|---|---|
| Heroku | [![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://www.heroku.com/deploy?template=https://github.com/Tohidkhan6332/TOHID-BUG) | Uses `app.json` + worker Procfile |
| Render | [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Tohidkhan6332/TOHID-BUG) | Uses `render.yaml` + Docker worker |
| Koyeb | [![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/deploy?type=git&builder=dockerfile&repository=github.com/Tohidkhan6332/TOHID-BUG&branch=main&name=tohid-ai) | GitHub + Docker deployment |
| Replit | [Open in Replit](https://replit.com/import/github/Tohidkhan6332/TOHID-BUG) | Import GitHub repo, then run/publish as a long-running app |

Render's button can deploy a repository described by a `render.yaml` Blueprint, Koyeb supports GitHub/Docker deployments and a Deploy button, and Replit supports importing GitHub repositories. citeturn0search1turn2search0turn1search0

### 🐳 Docker

The repository now includes a Node.js 20 Dockerfile.

```bash
docker build -t tohid-ai .
docker run -d --name tohid-ai --restart unless-stopped --env-file .env tohid-ai
```

This makes the same image suitable for VPS, Docker-capable cloud hosts, Koyeb, Render and other container platforms.

### 🖥️ VPS / Ubuntu / Debian / Kali Linux

```bash
sudo apt update
sudo apt install -y git nodejs npm ffmpeg
git clone https://github.com/Tohidkhan6332/TOHID-BUG.git
cd TOHID-BUG
npm install
cp .env.example .env
npm start
```

For a persistent VPS process:

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
```

> Kali Linux is supported as a normal Debian-based Node.js environment. Use Node.js 20+.

### 📱 Termux

```bash
pkg update -y
pkg install git nodejs-lts ffmpeg -y
git clone https://github.com/Tohidkhan6332/TOHID-BUG.git
cd TOHID-BUG
npm install
cp .env.example .env
npm start
```

PM2 can be used on Termux where the environment supports it.

### 🤖 AI coding agents: Claude / Gemini / Codex

Claude Code, Gemini and Codex are development agents rather than hosting platforms. They can work with this GitHub repository, modify it and prepare deployments, but the actual bot still needs a supported long-running runtime such as a VPS, Docker host, Render worker, Heroku worker, Koyeb service or a suitable Replit deployment.

### 🔄 Universal `.update`

The WhatsApp `.update` command is owner-only.

- VPS/Termux/Kali/PM2: pulls `main`, installs changed dependencies and restarts.
- Render/Heroku/other ephemeral hosts: use `TOHID_UPDATE_HOOK_URL` so the platform performs a fresh deployment instead of relying on a temporary filesystem.
- Docker: rebuild/redeploy the container through the host's deployment mechanism.
- Serverless/static-only hosts are **not** suitable for this WhatsApp bot because the bot requires a persistent long-running process.

Never put platform API tokens directly in the repository. Store secrets in the platform's environment-variable/secret manager.

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
