const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFile, spawn } = require('child_process');

const GITHUB_OWNER = process.env.UPDATE_GITHUB_OWNER || 'Tohidkhan6332';
const GITHUB_REPO = process.env.UPDATE_GITHUB_REPO || 'TOHID-BUG';
const GITHUB_BRANCH = process.env.UPDATE_GITHUB_BRANCH || 'main';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function detectPlatform() {
  if (process.env.TERMUX_VERSION || String(process.env.PREFIX || '').includes('com.termux')) return 'termux';
  if (process.env.PM2_HOME || process.env.pm_id || process.env.PM_ID) return 'pm2';
  if (process.env.RENDER || process.env.RENDER_SERVICE_ID) return 'render';
  if (process.env.HEROKU_APP_NAME || process.env.DYNO) return 'heroku';
  if (process.env.KOYEB_SERVICE_ID || process.env.KOYEB_APP) return 'koyeb';
  if (process.env.REPL_ID || process.env.REPLIT_DEPLOYMENT) return 'replit';
  if (process.env.PTERODACTYL || process.env.P_SERVER_UUID) return 'pterodactyl';
  if (process.env.DOCKER_CONTAINER || fs.existsSync('/.dockerenv')) return 'docker';
  if (process.env.INVOCATION_ID) return 'systemd';
  if (process.env.SUPERVISOR_ENABLED || process.env.SUPERVISOR_PROCESS_NAME) return 'supervisor';
  return 'generic';
}

function run(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { cwd: process.cwd(), windowsHide: true, maxBuffer: 1024 * 1024 * 8, ...options }, (error, stdout, stderr) => {
      if (error) { error.stdout = stdout; error.stderr = stderr; reject(error); return; }
      resolve({ stdout, stderr });
    });
  });
}

function requestJson(url, options = {}) {
  const method = options.method || 'GET';
  const headers = options.headers || {};
  const body = options.body || null;
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers: { 'User-Agent': 'TOHID-AI-Updater', 'Accept': 'application/json', ...headers } }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = {}; try { parsed = data ? JSON.parse(data) : {}; } catch {}
        if (res.statusCode >= 200 && res.statusCode < 300) return resolve(parsed);
        reject(new Error('HTTP ' + res.statusCode + ': ' + (parsed.message || data || 'request failed')));
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('Request timed out')));
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function restartProcess() {
  const platform = detectPlatform();
  if (platform === 'render' && process.env.RENDER_API_KEY && process.env.RENDER_SERVICE_ID) {
    await requestJson('https://api.render.com/v1/services/' + encodeURIComponent(process.env.RENDER_SERVICE_ID) + '/restart', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RENDER_API_KEY } });
    return { platform, method: 'render-api' };
  }
  if (platform === 'koyeb' && process.env.KOYEB_API_TOKEN && process.env.KOYEB_SERVICE_ID) {
    await requestJson('https://app.koyeb.com/v1/services/' + encodeURIComponent(process.env.KOYEB_SERVICE_ID) + '/redeploy', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.KOYEB_API_TOKEN } });
    return { platform, method: 'koyeb-api' };
  }
  if (platform === 'pm2') {
    const name = process.env.name || process.env.pm_exec_path || process.argv[1];
    try { await run('pm2', ['restart', name]); return { platform, method: 'pm2' }; }
    catch (error) { console.error('[RUNTIME] PM2 restart failed:', error.message); }
  }
  if (platform === 'termux' || platform === 'generic') {
    const child = spawn(process.execPath, process.argv.slice(1), { cwd: process.cwd(), env: { ...process.env, TOHID_RESTARTED: '1' }, detached: true, stdio: 'inherit' });
    child.unref();
    await sleep(700);
    process.exit(0);
  }
  setTimeout(() => process.exit(0), 700);
  return { platform, method: 'supervisor-exit' };
}

async function localGitUpdate() {
  if (!fs.existsSync(path.join(process.cwd(), '.git'))) {
    throw new Error('No .git directory found. Configure the hosting provider API variables or deploy the repository with Git.');
  }
  const pull = await run('git', ['pull', '--rebase', '--autostash', 'origin', GITHUB_BRANCH]);
  let install = null;
  if (fs.existsSync(path.join(process.cwd(), 'package.json'))) install = await run('npm', ['install', '--no-audit', '--no-fund']);
  return { source: 'git', pullOutput: String((pull.stdout || '') + (pull.stderr || '')).trim(), installOutput: String((install?.stdout || '') + (install?.stderr || '')).trim() };
}

async function renderUpdate() {
  if (!process.env.RENDER_API_KEY || !process.env.RENDER_SERVICE_ID) return false;
  await requestJson('https://api.render.com/v1/services/' + encodeURIComponent(process.env.RENDER_SERVICE_ID) + '/deploys', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RENDER_API_KEY, 'Content-Type': 'application/json' }, body: {} });
  return true;
}

async function koyebUpdate() {
  if (!process.env.KOYEB_API_TOKEN || !process.env.KOYEB_SERVICE_ID) return false;
  await requestJson('https://app.koyeb.com/v1/services/' + encodeURIComponent(process.env.KOYEB_SERVICE_ID) + '/redeploy', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.KOYEB_API_TOKEN } });
  return true;
}

async function herokuUpdate() {
  if (!process.env.HEROKU_API_KEY || !process.env.HEROKU_APP_NAME) return false;
  const sourceUrl = 'https://github.com/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/archive/refs/heads/' + GITHUB_BRANCH + '.tar.gz';
  await requestJson('https://api.heroku.com/apps/' + encodeURIComponent(process.env.HEROKU_APP_NAME) + '/builds', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.HEROKU_API_KEY, 'Content-Type': 'application/json', Accept: 'application/vnd.heroku+json; version=3' },
    body: { source_blob: { url: sourceUrl, version: GITHUB_BRANCH, version_description: 'TOHID-AI GitHub update' } }
  });
  return true;
}

async function updateFromGitHub() {
  const platform = detectPlatform();
  if (platform === 'render' && await renderUpdate()) return { platform, method: 'render-api', restartHandled: true };
  if (platform === 'koyeb' && await koyebUpdate()) return { platform, method: 'koyeb-api', restartHandled: true };
  if (platform === 'heroku' && await herokuUpdate()) return { platform, method: 'heroku-build-api', restartHandled: true };
  return { platform, ...(await localGitUpdate()) };
}

module.exports = { detectPlatform, restartProcess, updateFromGitHub, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH };