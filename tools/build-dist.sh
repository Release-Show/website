#!/usr/bin/env bash
# Assembles dist/: the exact set of files that should be public.
# An explicit allowlist, so repo tooling can never leak onto the site by accident.
# There is no build step for development: serve the repo root directly.
#
# Deploy with tools/deploy.sh (builds origin/main in a clean worktree; see
# README, Deploy). Do not deploy this script's dist/ directly: it is built from
# whatever the working copy holds, which may not be main.
set -euo pipefail
cd "$(dirname "$0")/.."

# The Content-Security-Policy in _headers has no 'unsafe-inline'. Refuse to build
# when a page carries something it would block: a style="" attribute (run
# tools/csp-inline-styles.py), or an inline <script> whose sha256 is not in
# _headers.
python3 tools/csp-inline-styles.py --check
python3 - <<'EOF'
import base64, hashlib, re, sys
headers = open('_headers').read()
bad = 0
for page in ('index.html', '404.html'):
    text = open(page).read()
    for attrs, body in re.findall(r'<script([^>]*)>(.*?)</script>', text, re.S):
        if 'src=' in attrs or 'application/ld+json' in attrs:
            continue
        h = 'sha256-' + base64.b64encode(hashlib.sha256(body.encode()).digest()).decode()
        if f"'{h}'" not in headers:
            print(f"CSP in _headers does not allow the inline script in {page} ('{h}')", file=sys.stderr)
            bad = 1
    if re.search(r'\sstyle="', text):
        print(f'{page} has a style="" attribute, which the CSP blocks', file=sys.stderr)
        bad = 1
    if re.search(r'\son[a-z]+="', text):
        print(f'{page} has an inline event handler, which the CSP blocks', file=sys.stderr)
        bad = 1
sys.exit(bad)
EOF

# The stylesheet points at the Higgsfield stills. Refuse to ship a page whose
# backgrounds 404: generate them first (tools/generate-images.sh).
missing=0
for img in $(grep -o '/assets/img/[a-z0-9-]*\.webp' assets/releaseshow.css | sort -u); do
  [ -s ".$img" ] || { echo "missing $img (run tools/generate-images.sh)" >&2; missing=1; }
done
[ "$missing" = 0 ] || exit 1

rm -rf dist
mkdir -p dist

# top-level files
for f in index.html 404.html robots.txt sitemap.xml llms.txt site.webmanifest _headers _redirects; do
  cp "$f" dist/
done

# directories served as-is
for d in assets .well-known; do
  cp -R "$d" "dist/$d"
done

find dist -name '.DS_Store' -delete

# Cache busting. Asset filenames are not content-hashed in the repo, so a deploy
# alone cannot invalidate a cached CSS/JS file. Stamp each reference with a short
# content hash here; _headers can then cache /assets/*.css and *.js immutably
# because the URL changes when the file does.
hash_of() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -c1-8
  else
    shasum -a 256 "$1" | cut -c1-8
  fi
}

for f in releaseshow.css releaseshow-inline.css releaseshow.js; do
  h=$(hash_of "dist/assets/$f")
  # `sed -i` is not portable: GNU takes no argument, BSD demands one. Write beside the file and move.
  find dist -name '*.html' | while IFS= read -r page; do
    sed "s|/assets/$f\"|/assets/$f?v=$h\"|g" "$page" > "$page.stamped" && mv "$page.stamped" "$page"
  done
  # A sed that matches nothing exits 0. Fail instead of shipping an immutable
  # asset under a URL that never changes.
  grep -q "/assets/$f?v=$h\"" dist/index.html || { echo "cache stamp for $f did not apply" >&2; exit 1; }
done

# GitHub-only artwork: not part of the site.
rm -f dist/assets/readme-banner.png dist/assets/org-avatar.png

echo "dist/ assembled:"
find dist -type f | sed 's|^dist/|  |' | sort
echo "  ($(find dist -type f | wc -l | tr -d ' ') files)"
