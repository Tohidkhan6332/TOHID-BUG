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

async function runWithRetry(command, args = [], options = {}, attempts = 3, delayMs = 2500) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await run(command, args, options);
    } catch (error) {
      lastError = error;
      const message = String(error?.message || '');
      const transient = /ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENETUNREACH|socket hang up|network/i.test(message);
      if (!transient || attempt === attempts) throw error;
      console.warn(`[UPDATE] ${command} network error (attempt ${attempt}/${attempts}): ${message}`);
      await sleep(delayMs * attempt);
    }
  }
  throw lastError;
}

async function localGitUpdate() {
  const gitDir = path.join(process.cwd(), '.git');
  if (!fs.existsSync(gitDir)) {
    throw new Error('No .git directory found. This deployment is not a Git checkout.');
  }

  const gitOptions = {
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
      GIT_ASKPASS: 'echo'
    }
  };

  // Do not use `git pull --rebase` here. A running bot can have local
  // changes or a diverged checkout, which makes self-update fail before
  // the latest GitHub commit is applied. Fetch the exact remote branch and
  // reset the code checkout to it instead.
  try {
    await run('git', ['config', '--local', 'http.version', 'HTTP/1.1'], gitOptions);
    await run('git', ['config', '--local', 'credential.interactive', 'false'], gitOptions);
  } catch (error) {
    console.warn('[UPDATE] Git local config warning:', error.message);
  }

  let fetch;
  try {
    fetch = await runWithRetry(
      'git',
      ['fetch', '--prune', '--no-tags', 'origin', GITHUB_BRANCH],
      gitOptions,
      4,
      3000
    );
  } catch (error) {
    const details = String(error.stderr || error.stdout || error.message || '').trim();
    throw new Error('GitHub fetch failed. ' + details.slice(-1800));
  }

  let reset;
  try {
    reset = await run(
      'git',
      ['reset', '--hard', 'FETCH_HEAD'],
      gitOptions
    );
  } catch (error) {
    const details = String(error.stderr || error.stdout || error.message || '').trim();
    throw new Error('Applying GitHub update failed. ' + details.slice(-1800));
  }

  let install = null;
  if (fs.existsSync(path.join(process.cwd(), 'package.json'))) {
    try {
      install = await runWithRetry(
        'npm',
        ['install', '--no-audit', '--no-fund', '--prefer-online'],
        {
          ...gitOptions,
          env: {
            ...gitOptions.env,
            npm_config_audit: 'false',
            npm_config_fund: 'false'
          }
        },
        3,
        3000
      );
    } catch (error) {
      const details = String(error.stderr || error.stdout || error.message || '').trim();
      throw new Error('Dependencies install failed. ' + details.slice(-1800));
    }
  }

  let head = null;
  try {
    head = await run('git', ['rev-parse', 'HEAD'], gitOptions);
  } catch (_) {}

  return {
    source: 'git',
    pullOutput: String(
      (fetch.stdout || '') +
      (fetch.stderr || '') +
      (reset.stdout || '') +
      (reset.stderr || '')
    ).trim(),
    installOutput: String((install?.stdout || '') + (install?.stderr || '')).trim(),
    commit: String(head?.stdout || '').trim()
  };
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