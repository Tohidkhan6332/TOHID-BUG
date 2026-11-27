/**
 * System status formatting and India-local clock helpers.
 * Kept separate from the WhatsApp message handler.
 */

function formatUptime(seconds) {
            const days = Math.floor(seconds / (24 * 60 * 60));
            seconds = seconds % (24 * 60 * 60);
            const hours = Math.floor(seconds / (60 * 60));
            seconds = seconds % (60 * 60);
            const minutes = Math.floor(seconds / 60);
            seconds = Math.floor(seconds % 60);

            let time = '';
            if (days > 0) time += `${days}d `;
            if (hours > 0) time += `${hours}h `;
            if (minutes > 0) time += `${minutes}m `;
            if (seconds > 0 || time === '') time += `${seconds}s`;
            return time.trim();
        }

function formatRam(total, free) {
            const used = (total - free) / (1024 * 1024 * 1024);
            const totalGb = total / (1024 * 1024 * 1024);
            const percent = ((used / totalGb) * 100).toFixed(1);
            return `${used.toFixed(1)}GB / ${totalGb.toFixed(1)}GB (${percent}%)`;
        }

function getMoodEmoji() {
            const hour = getLagosTime().getHours();
            if (hour < 12) return '🌅';
            if (hour < 18) return '☀️';
            return '🌙';
        }

function getLagosTime() {
            try {
                const options = {
                    timeZone: 'Asia/Kolkata',
                    hour12: false,
                    hour: 'numeric',
                    minute: 'numeric'
                };
                const formatter = new Intl.DateTimeFormat('en-GB', options);
                const parts = formatter.formatToParts(new Date());
                const hour = parts.find(part => part.type === 'hour').value;
                const minute = parts.find(part => part.type === 'minute').value;
                const now = new Date();
                const indiaDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
                return indiaDate;
            } catch (error) {
                const now = new Date();
                const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
                return new Date(utc + (3600000 * 1));
            }
        }

function formatLagosTime() {
            const lagosTime = getLagosTime();
            const hours = lagosTime.getHours().toString().padStart(2, '0');
            const minutes = lagosTime.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        }

module.exports = { formatUptime, formatRam, getMoodEmoji, getLagosTime, formatLagosTime };
