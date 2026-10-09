let installed = false;
let timer = null;

function install(options = {}) {
  if (installed) return;
  installed = true;
  const intervalMs = Number(options.intervalMs || process.env.PROCESS_GUARD_INTERVAL_MS || 30000);
  // Allow brief/heavy command workloads on low-power Android devices; only
  // restart after sustained high CPU use, not a short burst.
  const cpuLimit = Number(options.cpuPercent || process.env.PROCESS_GUARD_CPU_PERCENT || 180);
  const memoryLimitBytes = Number(options.memoryBytes || process.env.PROCESS_GUARD_MEMORY_BYTES || (10 * 1024 ** 3));
  const sustainedChecks = Math.max(1, Number(options.sustainedChecks || process.env.PROCESS_GUARD_SUSTAINED_CHECKS || 5));
  let highCpuChecks = 0;
  // Measure this Node process, not total host CPU usage. The previous
  // implementation could restart the bot simply because another process
  // on the VPS/Termux host was busy.
  let previousCpu = process.cpuUsage();
  let previousTime = process.hrtime.bigint();

  timer = setInterval(() => {
    const currentCpu = process.cpuUsage();
    const currentTime = process.hrtime.bigint();

    const elapsedMicros = Number(currentTime - previousTime) / 1000;
    const userMicros = currentCpu.user - previousCpu.user;
    const systemMicros = currentCpu.system - previousCpu.system;
    const cpuPercent = elapsedMicros > 0
      ? ((userMicros + systemMicros) / elapsedMicros) * 100
      : 0;

    previousCpu = currentCpu;
    previousTime = currentTime;

    const rss = process.memoryUsage().rss;
    if (cpuPercent >= cpuLimit) highCpuChecks += 1; else highCpuChecks = 0;
    // CPU spikes must not terminate the bot: WhatsApp message bursts and
    // metadata refreshes can keep a multi-core Node process above this limit.
    // Keep CPU monitoring for diagnostics, but restart only on the configured
    // memory ceiling, which is the hard resource limit.
    if (highCpuChecks >= sustainedChecks) {
      console.warn("[process-guard] sustained CPU usage detected; keeping bot alive.");
      highCpuChecks = 0;
    }
    if (rss >= memoryLimitBytes) {
      console.warn("[process-guard] memory threshold reached; restarting process.");
      clearInterval(timer);
      process.exit(1);
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
