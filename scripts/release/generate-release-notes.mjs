import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [, , version, outputPath = 'RELEASE_NOTES.md'] = process.argv;

if (!version) {
  console.error('Usage: node scripts/release/generate-release-notes.mjs <version> [outputPath]');
  process.exit(1);
}

function runGit(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function tryGit(args) {
  try {
    return runGit(args);
  } catch {
    return '';
  }
}

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const repoUrl = String(packageJson.repository?.url || '')
  .replace(/^git\+/, '')
  .replace(/\.git$/, '');

const previousTag = tryGit(['describe', '--tags', '--abbrev=0']);
const previousReleaseCommit = tryGit([
  'log',
  '--fixed-strings',
  '--grep',
  'chore(release): publish v',
  '--format=%H',
  '-n',
  '1',
]);

let commits = [];
if (previousTag) {
  commits = tryGit(['log', `${previousTag}..HEAD`, '--no-merges', '--pretty=format:%s (%h)'])
    .split('\n')
    .filter(Boolean);
} else if (previousReleaseCommit) {
  commits = tryGit(['log', `${previousReleaseCommit}..HEAD`, '--no-merges', '--pretty=format:%s (%h)'])
    .split('\n')
    .filter(Boolean);
} else {
  commits = tryGit(['log', '-n', '20', '--no-merges', '--pretty=format:%s (%h)'])
    .split('\n')
    .filter(Boolean);
}

commits = commits.filter((entry) => !entry.startsWith('chore(release): publish v'));

const lines = ["## What's Changed", ''];
if (commits.length === 0) {
  lines.push('- No user-facing changes were detected in this release window.');
} else {
  lines.push(...commits.map((entry) => `- ${entry}`));
}

if (repoUrl) {
  const compareBase = previousTag || previousReleaseCommit;
  if (compareBase) {
    lines.push('', `**Full Changelog**: ${repoUrl}/compare/${compareBase}...v${version}`);
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');

