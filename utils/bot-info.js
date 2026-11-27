/**
 * Stable bot identity and date/time display helpers.
 */

function getOwnerName() {
            return "𝕄ℝ 𝕋𝕆ℍ𝕀𝔻";
        }

function getDeveloperName() {
            return "𝕄ℝ 𝕋𝕆ℍ𝕀𝔻";
        }

function getBotVersion() {
            return "1.1";
        }

function getCurrentDateTime() {
            const date = new Date();
            const options = {
                timeZone: 'Asia/Kolkata',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            };
            return date.toLocaleString('en-IN', options) + ' IST';
        }

module.exports = { getOwnerName, getDeveloperName, getBotVersion, getCurrentDateTime };
