const fs = require("node:fs/promises");

async function getNetworkBytes() {
  try {
    const data = await fs.readFile("/proc/net/dev", "utf8");
    let inputBytes = 0; let outputBytes = 0;
    for (const line of data.split("\n")) {
      if (!line.includes(":")) continue;
      const [, stats] = line.split(":", 2);
      const values = stats.trim().split(/\s+/).map(Number);
      if (values.length >= 9) { inputBytes += values[0] || 0; outputBytes += values[8] || 0; }
    }
    return { inputBytes, outputBytes };
  } catch { return { inputBytes: 0, outputBytes: 0 }; }
}

module.exports = { getNetworkBytes };
