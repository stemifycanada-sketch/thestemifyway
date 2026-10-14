#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077

fail() { echo "STEMIFY: $*" >&2; exit 1; }
command -v node >/dev/null 2>&1 || fail "Node.js is missing. Install Node 22.12 or newer before starting."
command -v npm >/dev/null 2>&1 || fail "npm is missing. Install Node.js before starting."
node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 12) ? 0 : 1)' || fail "Use Node 22.12 or newer."

# The check reads configuration without opening or migrating the database.
portal_url=$(node --env-file-if-exists=.env scripts/backup-local.mjs --check-start)
mkdir -p .data
chmod 700 .data
mkdir .data/local-operation.lock 2>/dev/null || fail "A local start or backup is already in progress. See docs/local-portal.md if this lock was left after a crash."
trap 'rmdir .data/local-operation.lock 2>/dev/null || true' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Recheck after taking the lock so another launcher cannot become a second writer.
portal_url=$(node --env-file-if-exists=.env scripts/backup-local.mjs --check-start)
echo "STEMIFY will open at $portal_url"
echo "Keep this window open. Press Control-C to stop before making a backup."
echo "No packages are installed and no cloud database is used by this launcher."
npm start
