import fs from 'node:fs';

const [, , version, releaseDate, notesPath = 'RELEASE_NOTES.md', changelogPath = 'CHANGELOG.md'] = process.argv;

if (!version || !releaseDate) {
  console.error('Usage: node scripts/release/update-changelog.mjs <version> <releaseDate> [notesPath] [changelogPath]');
  process.exit(1);
}

const content = fs.readFileSync(changelogPath, 'utf8');
const notes = fs.readFileSync(notesPath, 'utf8').trim();
const newline = content.includes('\r\n') ? '\r\n' : '\n';
const marker = `## [Unreleased]${newline}${newline}`;

if (!content.includes(marker)) {
  console.error("CHANGELOG.md must contain the exact '## [Unreleased]' section header followed by a blank line.");
  process.exit(1);
}

const section = `## [${version}] - ${releaseDate}${newline}${newline}${notes.replace(/\r?\n/g, newline)}${newline}${newline}`;
const updated = content.replace(marker, `${marker}${section}`);
fs.writeFileSync(changelogPath, updated, 'utf8');
