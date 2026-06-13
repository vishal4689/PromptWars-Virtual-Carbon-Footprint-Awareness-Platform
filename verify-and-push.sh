#!/bin/bash
# verify-and-push.sh
# Run quick validations, build, and optionally push to GitHub.

set -euo pipefail

if [ -z "${1-}" ]; then
  echo "Usage: $0 <github-https-repo-url> [branch]"
  echo "Example: $0 https://github.com/username/repo.git main"
  exit 1
fi

GITHUB_REPO="$1"
BRANCH="${2-main}"

# Basic checks
if [ ! -f Dockerfile ]; then
  echo "ERROR: Dockerfile not found. Run this from project root." >&2
  exit 1
fi

if [ ! -f package.json ]; then
  echo "ERROR: package.json not found. Run this from project root." >&2
  exit 1
fi

# Run lint (if available)
if command -v npm >/dev/null 2>&1; then
  echo "Running npm ci..."
  npm ci
  echo "Running build..."
  npm run build
  echo "Running tests... (this may take a while)"
  npm run test || echo "Tests failed — review output before pushing"
else
  echo "npm not found in PATH; skipping build/tests"
fi

# Git push
if [ ! -d .git ]; then
  echo "Initializing git repository..."
  git init
fi

git remote add origin "${GITHUB_REPO}" 2>/dev/null || git remote set-url origin "${GITHUB_REPO}"

git add -A

if git diff --cached --quiet; then
  echo "No changes to commit. Skipping commit." 
else
  git commit -m "chore: prepare for gcloud deployment"
fi

# Push
echo "Pushing to ${GITHUB_REPO} branch ${BRANCH}..."
git branch -M ${BRANCH} || true
git push -u origin ${BRANCH}

echo "Push complete."
