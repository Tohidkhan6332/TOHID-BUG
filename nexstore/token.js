require("dotenv").config();

module.exports = {
  BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  startupPassword: process.env.STARTUP_PASSWORD || ""
};
