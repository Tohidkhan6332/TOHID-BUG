'use strict';

const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const { tohidAI } = require('./tohid-ai-provider');

const MAX_OUTPUT = 12000;
const MAX_FILE = 18000;
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function trimOutput(value, limit = MAX_OUTPUT) {
  const text = String(value || '').trim();
  return text.length > limit ? `${text.slice(0, limit)}\n… output truncated` : text;
}

function parseJsonObject(value) {
  const text = String(value || '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('GitHub returned invalid JSON.');
  return JSON.parse(text.slice(start, end + 1));
}

function validateRepo(repo) {
  const value = String(repo || '').trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
  if (!REPO_RE.test(value)) throw new Error('Invalid repository. Use owner/repository.');
  return value;
}

function validatePath(filePath) {
  const value = String(filePath || '').trim().replace(/^\/+/, '');
  if (!value || value.includes('..') || value.includes('\\')) throw new Error('Invalid repository path.');
  return value;
}

function validateRef(ref = 'main') {
  const value = String(ref || 'main').trim();
  if (!/^[A-Za-z0-9._\/-]+$/.test(value) || value.includes('..')) throw new Error('Invalid branch or ref.');
  return value;
}

async function gh(args, options = {}) {
  try {
    const result = await execFileAsync('gh', args, {
      cwd: options.cwd,
      timeout: options.timeout || 30000,
      maxBuffer: 1024 * 1024 * 4,
      windowsHide: true,
      env: { ...process.env, GH_PAGER: 'cat', PAGER: 'cat', GH_FORCE_TTY: '0', NO_COLOR: '1' },
    });
    return trimOutput(result.stdout || result.stderr || '', options.limit);
  } catch (error) {
    const detail = trimOutput(error?.stderr || error?.stdout || error?.message || 'GitHub CLI failed', 1200);
    if (/not found|enoent/i.test(detail)) throw new Error('GitHub CLI (gh) is not installed or unavailable on this server.');
    if (/not logged in|authentication|auth login|bad credentials|401/i.test(detail)) {
      throw new Error('GitHub connector authentication is unavailable in the bot runtime.');
    }
    throw new Error(detail);
  }
}

async function assertReady() {
  const login = await gh(['api', 'user', '--jq', '.login'], { limit: 200 });
  if (!login) throw new Error('GitHub authentication returned no account.');
  return login;
}

async function listRepos(query = '') {
  const owner = await assertReady();
  const search = String(query || '').trim().toLowerCase();
  const raw = await gh(['repo', 'list', owner, '--limit', '100', '--json', 'nameWithOwner,isPrivate,defaultBranchRef,updatedAt,description'], { limit: 20000 });
  let repos;
  try { repos = JSON.parse(raw); } catch { throw new Error('GitHub returned an invalid repository list.'); }
  const filtered = repos.filter(repo => !search || JSON.stringify(repo).toLowerCase().includes(search));
  if (!filtered.length) return `No repositories found${search ? ` matching “${search}”` : ''}.`;
  return filtered.slice(0, 30).map((repo, index) => {
    const branch = repo.defaultBranchRef?.name || 'unknown';
    const visibility = repo.isPrivate ? 'private' : 'public';
    return `${index + 1}. ${repo.nameWithOwner} • ${visibility} • ${branch}\n   ${repo.description || 'No description'}`;
  }).join('\n');
}

async function repoInfo(repo) {
  const value = validateRepo(repo);
  const raw = await gh([
    'api', `repos/${value}`,
    '--jq', '{full_name,private,default_branch,open_issues_count,pushed_at,html_url,description}'
  ], { limit: 5000 });
  let data;
  try { data = parseJsonObject(raw); } catch { throw new Error('GitHub returned invalid repository metadata.'); }
  return [
    `Repository: ${data.full_name}`,
    `Visibility: ${data.private ? 'private' : 'public'}`,
    `Default branch: ${data.default_branch}`,
    `Open issues: ${data.open_issues_count}`,
    `Last push: ${data.pushed_at || 'unknown'}`,
    `URL: ${data.html_url}`,
    `Description: ${data.description || 'No description'}`,
  ].join('\n');
}

async function readFile(repo, filePath, ref = 'main') {
  const value = validateRepo(repo);
  const file = validatePath(filePath);
  const branch = validateRef(ref);
  const raw = await gh(['api', `repos/${value}/contents/${file}?ref=${encodeURIComponent(branch)}`, '--jq', '.content'], { limit: 30000 });
  try {
    const decoded = Buffer.from(raw.replace(/\s+/g, ''), 'base64').toString('utf8');
    return trimOutput(`📄 ${value}/${file} @ ${branch}\n\n${decoded}`, MAX_FILE);
  } catch {
    throw new Error('Unable to decode the requested file. It may be a directory or binary file.');
  }
}

async function searchCode(repo, query) {
  const value = validateRepo(repo);
  const needle = String(query || '').trim();
  if (!needle || needle.length > 160) throw new Error('Search text is required and must be under 160 characters.');
  const raw = await gh(['search', 'code', needle, '--repo', value, '--json', 'path,url', '--limit', '30'], { limit: 12000 });
  let matches;
  try { matches = JSON.parse(raw); } catch { throw new Error('GitHub returned an invalid code-search result.'); }
  if (!Array.isArray(matches) || !matches.length) return 'No matching files found.';
  return matches.map(item => `${item.path} — ${item.url}`).join('\n');
}

async function aiCodeAssistant(request) {
  const userRequest = String(request || '').trim();
  if (!userRequest) throw new Error('Natural-language request is required.');
  if (userRequest.length > 6000) throw new Error('Request is too long. Keep it under 6000 characters.');

  const system = [
    'You are TOHID-AI GitHub coding assistant.',
    'Understand Hindi, Hinglish, and English requests.',
    'Help with JavaScript/Node.js repositories, debugging, refactoring, tests, and code generation.',
    'Return a practical answer with these headings: Understanding, Plan, Generated Code or Diff, Tests, Safety.',
    'If repository files are not provided, clearly mark assumptions and do not pretend you edited or tested anything.',
    'Generate complete, copy-pasteable code when the request is specific; preserve existing project conventions.',
    'Never include API keys, tokens, passwords, cookies, or other secrets in generated code.',
    'This first safe mode only proposes code. It does not commit, push, delete, merge, or change GitHub settings.',
  ].join('\n');

  const answer = await tohidAI(userRequest, system);
  return String(answer || 'AI returned an empty response.').slice(0, 18000);
}

async function execute(input) {
  const parts = String(input || '').trim().split(/\s+/).filter(Boolean);
  const action = (parts.shift() || 'help').toLowerCase();
  if (action === 'help') {
    return [
      '🤖 .githubai — SAFE OWNER MODE',
      '',
      'Commands:',
      '.githubai me',
      '.githubai repos [search]',
      '.githubai info owner/repo',
      '.githubai read owner/repo path [branch]',
      '.githubai search owner/repo search-text',
      '.githubai ask <normal-language coding request>',
      '',
      'AI can understand Hindi/Hinglish/English and generate code or diffs for review.',
      'No code is written, committed, pushed, deleted or merged in safe mode.',
    ].join('\n');
  }
  if (action === 'me') return `Authenticated GitHub account: ${await assertReady()}`;
  if (action === 'repos') return listRepos(parts.join(' '));
  if (action === 'info') {
    if (!parts[0]) throw new Error('Usage: .githubai info owner/repo');
    return repoInfo(parts[0]);
  }
  if (action === 'read') {
    if (!parts[0] || !parts[1]) throw new Error('Usage: .githubai read owner/repo path [branch]');
    return readFile(parts[0], parts[1], parts[2] || 'main');
  }
  if (action === 'search') {
    if (!parts[0] || !parts[1]) throw new Error('Usage: .githubai search owner/repo search-text');
    return searchCode(parts[0], parts.slice(1).join(' '));
  }
  if (action === 'ask' || action === 'ai' || action === 'generate' || action === 'fix' || action === 'analyze' || action === 'review') {
    return aiCodeAssistant([action, ...parts].join(' '));
  }
  // Natural language is the default: `.githubai login issue fix karo` should
  // reach the AI instead of requiring a rigid subcommand.
  return aiCodeAssistant(String(input || '').trim());
}

module.exports = { execute, validateRepo, assertReady, aiCodeAssistant };
