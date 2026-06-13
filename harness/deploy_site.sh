#!/usr/bin/env bash
# Deploy site/ to the gh-pages branch and enable GitHub Pages -> public URL.
set -euo pipefail
cd "$(dirname "$0")/.."

REPO="raghavrajsah/glassbox"
TMP="$(mktemp -d)"
cp -R site/* "$TMP/"
touch "$TMP/.nojekyll"

git worktree remove --force /tmp/ghp 2>/dev/null || true
rm -rf /tmp/ghp
if git show-ref --verify --quiet refs/heads/gh-pages; then
  git worktree add /tmp/ghp gh-pages
else
  git worktree add --orphan -b gh-pages /tmp/ghp
fi

rm -rf /tmp/ghp/* /tmp/ghp/.nojekyll 2>/dev/null || true
cp -R "$TMP"/. /tmp/ghp/
cd /tmp/ghp
git add -A
git commit -q -m "Deploy Glassbox site $(date -u +%Y-%m-%dT%H:%MZ)" || echo "no changes"
git push -u origin gh-pages
cd - >/dev/null
git worktree remove --force /tmp/ghp || true

# enable Pages from gh-pages branch root (idempotent)
gh api -X POST "repos/$REPO/pages" -f "source[branch]=gh-pages" -f "source[path]=/" 2>/dev/null \
  || gh api -X PUT "repos/$REPO/pages" -f "source[branch]=gh-pages" -f "source[path]=/" 2>/dev/null \
  || echo "Pages already configured"

echo "Public URL: https://raghavrajsah.github.io/glassbox/"
