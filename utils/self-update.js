/**
 * TOHID-AI self-update system
 * Updates the running installation from the configured GitHub repository.
 *
 * Requirements:
 * - The deployment must contain a writable Git working tree.
 * - Git and npm must be available on the host.
 * - The process must be supervised/restarted by the hosting platform, or
 *   TOHID-AI will spawn the same entry point before exiting.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, spawn } = require('child_process');
const https = require('https');

const UPDATE_REPO = 'https://github.com/Tohidkhan6332/TOHID-BUG.git';
const UPDATE_BRANCH = 'main';

function run(command, args, options = {}) {
    const env = {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
        GIT_ASKPASS: 'echo',
        ...options.env
    };

    return execFileSync(command, args, {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: options.timeout || 90000,
        killSignal: 'SIGKILL',
        ...options,
        env
    }).trim();
}

function git(args) {
    return run('git', args);
}

function isGitRepository() {
    return fs.existsSync(path.join(process.cwd(), '.git'));
}

function hasTrackedChanges() {
    try {
        git(['diff', '--quiet']);
        git(['diff', '--cached', '--quiet']);
        return false;
    } catch {
        return true;
    }
}

function triggerUpdateHook() {
    const hookUrl = process.env.TOHID_UPDATE_HOOK_URL;
    if (!hookUrl) return null;

    return new Promise((resolve, reject) => {
        let url;
        try {
            url = new URL(hookUrl);
        } catch {
            return reject(new Error('TOHID_UPDATE_HOOK_URL is not a valid URL.'));
        }

        if (!['https:', 'http:'].includes(url.protocol)) {
            return reject(new Error('TOHID_UPDATE_HOOK_URL must use HTTP or HTTPS.'));
        }

        const request = https.request(url, {
            method: String(process.env.TOHID_UPDATE_HOOK_METHOD || 'POST').toUpperCase(),
            headers: {
                'User-Agent': 'TOHID-AI-Updater/1.0',
                'Content-Length': '0'
            },
            timeout: 15000
        }, response => {
            response.resume();
            if (response.statusCode >= 200 && response.statusCode < 300) {
                resolve({
                    platform: process.env.RENDER ? 'render' : (process.env.HEROKU_APP_NAME ? 'heroku' : 'hook'),
                    updated: true,
                    dependenciesChanged: false,
                    deploymentTriggered: true
                });
            } else {
                reject(new Error(`Update hook returned HTTP ${response.statusCode}.`));
            }
        });

        request.on('timeout', () => request.destroy(new Error('Update hook timed out.')));
        request.on('error', reject);
        request.end();
    });
}

function isPackageChange(currentSha, latestSha) {
    const changed = git([
        'diff',
        '--name-only',
        currentSha,
        latestSha,
        '--',
        'package.json',
        'package-lock.json'
    ]);

    return Boolean(changed);
}

async function updateFromGitHub() {
    // Optional deployment hook for ephemeral hosts such as Heroku/Render.
    // The hook must trigger a deployment from the current GitHub main branch.
    const hookResult = await triggerUpdateHook();
    if (hookResult) return hookResult;

    if (!isGitRepository()) {
        throw new Error(
            'This deployment does not contain a Git repository. ' +
            'Deploy the bot from the TOHID-BUG Git repository to use .update.'
        );
    }

    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
    if (!branch || branch === 'HEAD') {
        throw new Error('The bot is running from a detached Git HEAD.');
    }

    const remote = git(['remote', 'get-url', 'origin']);
    const normalizedRemote = remote
        .replace(/\.git$/, '')
        .replace(/^git@github\.com:/, 'https://github.com/')
        .replace(/\/$/, '');

    const expectedRemote = UPDATE_REPO
        .replace(/\.git$/, '')
        .replace(/\/$/, '');

    if (normalizedRemote !== expectedRemote) {
        throw new Error(
            'The current Git remote does not match the official TOHID-BUG repository.'
        );
    }

    if (branch !== UPDATE_BRANCH) {
        throw new Error(
            `The current branch is "${branch}". Switch the deployment to "${UPDATE_BRANCH}" before using .update.`
        );
    }

    // The bot writes runtime data to some tracked JSON files (owner, premium,
    // database state, etc.). Do not abort .update because of those files.
    // Preserve runtime data while taking the code from GitHub as the source of truth.
    let updateStash = null;
    if (hasTrackedChanges()) {
        try {
            git(['stash', 'push', '-m', 'TOHID-AI automatic runtime-data backup']);
            updateStash = 'stash@{0}';
        } catch (error) {
            throw new Error(
                'Unable to safely preserve local runtime data before update: ' +
                (error.message || error)
            );
        }
    }

    const restoreStash = () => {
        if (!updateStash) return;
        try {
            git(['stash', 'pop', '--index', updateStash]);
            updateStash = null;
        } catch (restoreError) {
            console.error('[UPDATE] Could not restore local runtime stash:', restoreError.message);
        }
    };

    let currentSha;
    let latestSha;
    try {
        git(['config', '--local', 'http.version', 'HTTP/1.1']);
        git(['config', '--local', 'credential.interactive', 'false']);
        git(['fetch', '--prune', '--no-tags', 'origin', UPDATE_BRANCH], { timeout: 90000 });
        currentSha = git(['rev-parse', 'HEAD']);
        latestSha = git(['rev-parse', `origin/${UPDATE_BRANCH}`]);
    } catch (error) {
        restoreStash();
        const detail = error?.stderr || error?.stdout || error?.message || 'unknown Git error';
        throw new Error('GitHub check failed: ' + String(detail).trim().slice(-1800));
    }

    // Even when the commit SHA is already current, the working tree may
    // contain a broken/stale tracked source file. In that case .update must
    // still restore the exact GitHub version. Runtime JSON changes were stashed
    // above and are restored selectively after the source reset.
    const sourceNeedsRefresh = currentSha !== latestSha || Boolean(updateStash);

    if (!sourceNeedsRefresh) {
        return {
            updated: false,
            currentSha,
            latestSha,
            dependenciesChanged: false
        };
    }

    // Only allow a fast-forward update when the commit itself changed. This
    // prevents .update from silently destroying local history or merging
    // unexpected changes.
    // silently destroying local history or merging unexpected changes.
    try {
        git(['merge-base', '--is-ancestor', currentSha, latestSha]);
    } catch {
        restoreStash();
        throw new Error(
            'The local branch cannot be fast-forwarded to GitHub main. Manual intervention is required.'
        );
    }

    let dependenciesChanged;
    try {
        dependenciesChanged = isPackageChange(currentSha, latestSha);
    } catch (error) {
        restoreStash();
        throw error;
    }

    try {
        // Apply exactly the GitHub main branch that was just fetched.
        // This avoids pull/merge prompts and makes .update deterministic.
        git(['reset', '--hard', `origin/${UPDATE_BRANCH}`], { timeout: 90000 });
    } catch (error) {
        restoreStash();
        const detail = error?.stderr || error?.stdout || error?.message || 'unknown Git reset error';
        throw new Error('Applying GitHub update failed: ' + String(detail).trim().slice(-1800));
    }



    if (dependenciesChanged) {
        try {
            run('npm', ['install', '--no-audit', '--no-fund', '--prefer-online'], { timeout: 15 * 60 * 1000 });
        } catch (error) {
            // Roll the source tree back first, then restore the runtime stash.
            try {
                git(['reset', '--hard', currentSha]);
            } catch (_) {}
            restoreStash();
            throw new Error(
                'Source update was rolled back because npm install failed: ' +
                (error.stderr || error.message || 'unknown npm error')
            );
        }
    }

    // Restore only runtime JSON state from the backup. Code/config edits remain
    // on GitHub's version. This prevents .update from losing live bot data.
    if (updateStash) {
        let runtimeFiles = '';
        try {
            runtimeFiles = git(['stash', 'show', '--name-only', updateStash]);
        } catch (_) {}

        const files = runtimeFiles
            .split('\n')
            .map(file => file.trim())
            .filter(Boolean)
            .filter(file =>
                /^(allfunc|database|tohidstore|axis_storage)\//i.test(file) &&
                /\.json$/i.test(file)
            );

        for (const file of files) {
            try {
                git(['checkout', updateStash, '--', file]);
            } catch (restoreError) {
                console.warn('[UPDATE] Could not restore runtime file ' + file + ': ' + restoreError.message);
            }
        }

        try {
            git(['stash', 'drop', updateStash]);
            updateStash = null;
        } catch (_) {}
    }

    // Validate the entry point before restarting. A bad update must not
    // take down the currently running bot.
    try {
        run(process.execPath, ['--check', entryPointForValidation()], { timeout: 30000 });
    } catch (error) {
        try { git(['reset', '--hard', currentSha]); } catch (_) {}
        throw new Error(
            'Update validation failed; bot was NOT restarted: ' +
            String(error.stderr || error.stdout || error.message || 'syntax error').trim().slice(-1800)
        );
    }

    return {
        updated: true,
        currentSha,
        latestSha,
        dependenciesChanged
    };
}

function entryPointForValidation() {
    return process.argv[1]
        ? path.resolve(process.argv[1])
        : path.join(process.cwd(), 'index.js');
}

function restartProcess() {
    const entryPoint = process.argv[1]
        ? path.resolve(process.argv[1])
        : path.join(process.cwd(), 'index.js');

    const supervised = Boolean(
        process.env.pm_id ||
        process.env.PM2_HOME ||
        process.env.PTERODACTYL_CONTAINER ||
        process.env.RENDER ||
        process.env.HEROKU_APP_NAME
    );

    if (supervised) {
        setTimeout(() => process.exit(0), 800);
        return;
    }

    // Plain Termux/node deployments need a real detached replacement process.
    // Keep a small restart log because detached children otherwise fail silently.
    const restartLog = path.join(process.cwd(), 'database', 'update-restart.log');
    try {
        fs.mkdirSync(path.dirname(restartLog), { recursive: true });
        fs.appendFileSync(
            restartLog,
            `\\n[${new Date().toISOString()}] Starting replacement process: ${entryPoint}\\n`
        );
    } catch (_) {}

    let child;
    try {
        child = spawn(
            process.execPath,
            [entryPoint, ...process.argv.slice(2)],
            {
                cwd: process.cwd(),
                env: {
                    ...process.env,
                    TOHID_UPDATE_RESTART: '1',
                    TOHID_WAIT_FOR_PARENT_PID: String(process.pid)
                },
                detached: true,
                stdio: ['ignore', 'ignore', 'ignore']
            }
        );
        child.unref();

        try {
            fs.appendFileSync(
                restartLog,
                `[${new Date().toISOString()}] Replacement spawned, pid=${child.pid}\\n`
            );
        } catch (_) {}

        // Give the replacement process a moment to start before terminating
        // the old process. The replacement waits for this PID to disappear.
        setTimeout(() => process.exit(0), 1500);
    } catch (error) {
        console.error('[UPDATE] Replacement process could not be spawned:', error);
        try {
            fs.appendFileSync(
                restartLog,
                `[${new Date().toISOString()}] SPAWN FAILED: ${error.stack || error.message}\\n`
            );
        } catch (_) {}
        // Never kill the currently working bot if a replacement could not
        // be created.
    }
}

module.exports = {
    updateFromGitHub,
    restartProcess,
    UPDATE_REPO,
    UPDATE_BRANCH
};
