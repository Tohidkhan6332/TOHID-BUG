const os = require("node:os");

let installed = false;
let timer = null;

function install(options = {}) {
  if (installed) return;
  installed = true;
  const intervalMs = Number(options.intervalMs || process.env.PROCESS_GUARD_INTERVAL_MS || 30000);
  const cpuLimit = Number(options.cpuPercent || process.env.PROCESS_GUARD_CPU_PERCENT || 90);
  const memoryLimitBytes = Number(options.memoryBytes || process.env.PROCESS_GUARD_MEMORY_BYTES || (10 * 1024 ** 3));
  const sustainedChecks = Math.max(1, Number(options.sustainedChecks || process.env.PROCESS_GUARD_SUSTAINED_CHECKS || 3));
  let highCpuChecks = 0;
  const sampleCpu = () => {
    const cpus = os.cpus(); let idle = 0; let total = 0;
    for (const cpu of cpus) { const t = cpu.times; idle += t.idle; total += t.user + t.nice + t.sys + t.irq + t.idle; }
    return { idle, total };
  };
  let previous = sampleCpu();
  timer = setInterval(() => {
    const current = sampleCpu();
    const totalDelta = current.total - previous.total; const idleDelta = current.idle - previous.idle;
    previous = current;
    const cpuPercent = totalDelta > 0 ? ((totalDelta - idleDelta) / totalDelta) * 100 : 0;
    const rss = process.memoryUsage().rss;
    if (cpuPercent >= cpuLimit) highCpuChecks += 1; else highCpuChecks = 0;
    if (rss >= memoryLimitBytes || highCpuChecks >= sustainedChecks) {
      console.warn("[process-guard] resource threshold reached; restarting process.");
      clearInterval(timer); process.exit(1);
    }
  }, intervalMs);
  timer.unref?.();
}

function uninstall() {
  if (timer) clearInterval(timer);
  timer = null;
  installed = false;
}

module.exports = { install, uninstall };
