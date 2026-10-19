#!/bin/sh
# Validate, push main to GitHub, and wait for the GitHub Pages deployment.
set -e

branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" != "main" ]; then
  echo "Deploys go out from main (current branch: $branch). Merge into main first."
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "You have uncommitted changes. Commit or stash them before deploying."
  git status --short
  exit 1
fi

npm run check
git fetch --quiet origin main
if [ -z "$(git log origin/main..main --oneline)" ]; then
  echo "Nothing new to deploy: main matches origin/main."
  exit 0
fi

echo "Deploying these commits:"
git log origin/main..main --oneline
git push origin main

if command -v gh >/dev/null 2>&1; then
  echo "Waiting for GitHub Pages to start building..."
  sleep 8
  run=$(gh run list --workflow pages-build-deployment --branch main --limit 1 --json databaseId --jq '.[0].databaseId')
  [ -n "$run" ] && gh run watch "$run" --exit-status
  echo "Live at https://marwaan.net/"
else
  echo "Pushed. GitHub Pages will publish https://marwaan.net/ in about a minute."
fi
